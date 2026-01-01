import { selectionRepository } from '../repositories/selection.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { photoRepository } from '../repositories/photo.repository.js';
import { googleDriveService } from './drive.service.js';
import type { NewSelection } from '../db/schema.js';
import archiver from 'archiver';
import type { Response } from 'express';

export interface CreateSelectionData {
  projectToken: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  photoIds: number[];
  notes?: string;
}

export interface SelectionWithPhotos {
  id: number;
  projectId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  selectedPhotosCount: number;
  additionalPhotosCount: number;
  totalPrice: string;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  photos: any[];
  project?: any;
}

export class SelectionService {
  async createSelection(data: CreateSelectionData): Promise<SelectionWithPhotos> {
    // Buscar projeto pelo token
    const project = await projectRepository.findByGalleryToken(data.projectToken);
    if (!project) {
      throw new Error('Project not found');
    }

    // Verificar se a galeria está aberta
    if (project.galleryStatus === 'closed') {
      throw new Error('Gallery is closed');
    }

    // Validar que as fotos pertencem ao projeto
    const photos = await photoRepository.findByIds(data.photoIds);
    const validPhotos = photos.filter((p) => p.projectId === project.id);

    if (validPhotos.length !== data.photoIds.length) {
      throw new Error('Some photos do not belong to this project');
    }

    // Calcular custos
    const selectedCount = validPhotos.length;
    const packageCount = project.packagePhotosCount;
    const additionalCount = Math.max(0, selectedCount - packageCount);
    const additionalPrice = parseFloat(project.additionalPhotoPrice);
    const totalPrice = (additionalCount * additionalPrice).toFixed(2);

    // Criar seleção
    const selectionData: NewSelection = {
      projectId: project.id,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      selectedPhotosCount: selectedCount,
      additionalPhotosCount: additionalCount,
      totalPrice,
      notes: data.notes,
      status: 'pending',
    };

    const selection = await selectionRepository.create(selectionData);

    // Adicionar fotos selecionadas
    await selectionRepository.addSelectedPhotos(selection.id, data.photoIds);

    // Fechar a galeria após a seleção
    await projectRepository.closeGallery(project.id);

    // Buscar seleção completa
    const fullSelection = await selectionRepository.findById(selection.id);
    if (!fullSelection) {
      throw new Error('Failed to create selection');
    }

    // SEGURANÇA: Retornar resposta mínima sem expor dados sensíveis
    // Cliente não precisa ver fotos completas, apenas confirmação
    return {
      id: fullSelection.id,
      projectId: fullSelection.projectId,
      clientName: fullSelection.clientName,
      clientEmail: fullSelection.clientEmail,
      selectedPhotosCount: fullSelection.selectedPhotosCount,
      additionalPhotosCount: fullSelection.additionalPhotosCount,
      totalPrice: fullSelection.totalPrice,
      status: fullSelection.status,
      createdAt: fullSelection.createdAt,
      // REMOVIDO: photos com driveFileId, originalUrl, etc
    } as any;
  }

  async getSelectionsByProject(projectId: number, userId: number) {
    // Verificar se o projeto pertence ao usuário
    const project = await projectRepository.findByIdAndUserId(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }

    const selections = await selectionRepository.findByProjectId(projectId);

    return selections.map((selection) => ({
      ...selection,
      photos: selection.selectedPhotos.map((sp) => ({
        ...sp.photo,
        downloadUrl: googleDriveService.getDirectDownloadUrl(sp.photo.driveFileId),
      })),
    }));
  }

  async getSelection(selectionId: number) {
    const selection = await selectionRepository.findById(selectionId);
    if (!selection) {
      throw new Error('Selection not found');
    }

    return {
      ...selection,
      photos: selection.selectedPhotos.map((sp) => sp.photo),
    };
  }

  async updateSelectionStatus(
    selectionId: number,
    userId: number,
    status: string
  ) {
    const selection = await selectionRepository.findById(selectionId);
    if (!selection) {
      throw new Error('Selection not found');
    }

    // Verificar se o projeto pertence ao usuário
    const project = await projectRepository.findByIdAndUserId(selection.projectId, userId);
    if (!project) {
      throw new Error('Unauthorized');
    }

    const updated = await selectionRepository.update(selectionId, { status });
    if (!updated) {
      throw new Error('Failed to update selection');
    }

    return updated;
  }

  async deleteSelection(selectionId: number, userId: number) {
    const selection = await selectionRepository.findById(selectionId);
    if (!selection) {
      throw new Error('Selection not found');
    }

    // Verificar se o projeto pertence ao usuário
    const project = await projectRepository.findByIdAndUserId(selection.projectId, userId);
    if (!project) {
      throw new Error('Unauthorized');
    }

    const deleted = await selectionRepository.delete(selectionId);
    if (!deleted) {
      throw new Error('Failed to delete selection');
    }
  }

  async downloadSelectionAsZip(selectionId: number, userId: number, res: Response) {
    const selection = await selectionRepository.findById(selectionId);
    if (!selection) {
      throw new Error('Selection not found');
    }

    // Verificar se o projeto pertence ao usuário
    const project = await projectRepository.findByIdAndUserId(selection.projectId, userId);
    if (!project) {
      throw new Error('Unauthorized');
    }

    // Configurar headers para download
    const zipFileName = `selecao_${project.name.replace(/\s+/g, '_')}_${selection.clientName.replace(/\s+/g, '_')}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    // Criar arquivo ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Nível máximo de compressão
    });

    // Pipe o arquivo ZIP para a response
    archive.pipe(res);

    // Baixar e adicionar cada foto ao ZIP
    const photos = selection.selectedPhotos.map((sp) => sp.photo);
    
    for (const photo of photos) {
      try {
        console.log(`Baixando foto: ${photo.driveFileName}`);
        const fileBuffer = await googleDriveService.downloadFile(photo.driveFileId);
        archive.append(fileBuffer, { name: photo.driveFileName });
      } catch (error) {
        console.error(`Erro ao baixar foto ${photo.driveFileName}:`, error);
        // Continua com as outras fotos mesmo se uma falhar
      }
    }

    // Finalizar o arquivo ZIP
    await archive.finalize();
  }
}

export const selectionService = new SelectionService();
