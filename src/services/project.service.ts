import { v4 as uuidv4 } from 'uuid';
import { projectRepository } from '../repositories/project.repository.js';
import { photoRepository } from '../repositories/photo.repository.js';
import { selectionRepository } from '../repositories/selection.repository.js';
import { googleDriveService } from './drive.service.js';
import type { NewProject, Project } from '../db/schema.js';

export interface CreateProjectData {
  name: string;
  description?: string;
  driveFolderUrl: string;
  packagePhotosCount?: number;
  additionalPhotoPrice?: number;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  packagePhotosCount?: number;
  additionalPhotoPrice?: number;
  status?: string;
}

export interface ProjectWithStats extends Project {
  photosCount: number;
  selectionsCount: number;
  galleryUrl: string;
}

export class ProjectService {
  private readonly FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  async createProject(userId: number, data: CreateProjectData): Promise<ProjectWithStats> {
    // Extrair folder ID da URL do Google Drive
    const driveFolderId = this.extractDriveFolderId(data.driveFolderUrl);
    if (!driveFolderId) {
      throw new Error('Invalid Google Drive folder URL');
    }

    // Gerar token único para a galeria
    const galleryToken = uuidv4();

    const projectData: NewProject = {
      userId,
      name: data.name,
      description: data.description,
      driveFolderUrl: data.driveFolderUrl,
      driveFolderId,
      packagePhotosCount: data.packagePhotosCount || 10,
      additionalPhotoPrice: data.additionalPhotoPrice?.toString() || '50.00',
      galleryToken,
      status: 'active',
    };

    const project = await projectRepository.create(projectData);
    
    // Nota: A sincronização das fotos deve ser feita manualmente via endpoint /api/drive/sync/:projectId
    // ou automaticamente em background job (recomendado para produção)
    
    return {
      ...project,
      photosCount: 0,
      selectionsCount: 0,
      galleryUrl: `${this.FRONTEND_URL}/gallery/${galleryToken}`,
    };
  }

  async syncProjectPhotos(projectId: number, userId: number): Promise<{ syncedCount: number; totalImages: number }> {
    const project = await projectRepository.findByIdAndUserId(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (!project.driveFolderId) {
      throw new Error('Project does not have a Google Drive folder configured');
    }

    // Verifica acesso à pasta
    const hasAccess = await googleDriveService.checkFolderAccess(project.driveFolderId);
    if (!hasAccess) {
      throw new Error('Cannot access Google Drive folder. Make sure it is publicly shared (Anyone with the link can view)');
    }

    return { syncedCount: 0, totalImages: 0 };
  }

  async getProjects(userId: number, status?: string): Promise<ProjectWithStats[]> {
    const projects = await projectRepository.findByUserIdWithStats(userId, status);

    return projects.map((p) => ({
      ...p.project,
      photosCount: Number(p.photosCount) || 0,
      selectionsCount: Number(p.selectionsCount) || 0,
      galleryUrl: `${this.FRONTEND_URL}/gallery/${p.project.galleryToken}`,
    }));
  }

  async getProject(projectId: number, userId: number): Promise<ProjectWithStats> {
    const project = await projectRepository.findByIdAndUserId(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }

    const photosCount = await photoRepository.count(projectId);
    
    // TODO: Contar seleções
    const selectionsCount = 0;

    return {
      ...project,
      photosCount,
      selectionsCount,
      galleryUrl: `${this.FRONTEND_URL}/gallery/${project.galleryToken}`,
    };
  }

  async getProjectByToken(token: string) {
    const project = await projectRepository.findByGalleryToken(token);
    if (!project) {
      throw new Error('Gallery not found');
    }

    const photos = await photoRepository.findByProjectId(project.id);

    // SEGURANÇA: Retornar APENAS campos seguros para galeria pública
    // NUNCA expor: driveFileId, driveFolderId, driveFolderUrl, originalUrl, userId
    const safePhotos = photos.map((photo) => ({
      id: photo.id,
      // Apenas URLs com marca d'água (reduzidas)
      thumbnailUrl: googleDriveService.getWatermarkedThumbnailUrl(photo.driveFileId), // 400px para grid
      fullImageUrl: googleDriveService.getWatermarkedLightboxUrl(photo.driveFileId), // 1200px para lightbox
      // Sem driveFileId, originalUrl ou qualquer referência ao Drive
    }));

    // SEGURANÇA: Retornar APENAS campos seguros do projeto
    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        packagePhotosCount: project.packagePhotosCount,
        additionalPhotoPrice: project.additionalPhotoPrice,
        galleryStatus: project.galleryStatus,
        galleryToken: project.galleryToken,
        galleryUrl: `${this.FRONTEND_URL}/gallery/${project.galleryToken}`,
        // REMOVIDOS: driveFolderUrl, driveFolderId, userId, status
      },
      photos: safePhotos,
    };
  }

  async getProjectPhotos(projectId: number, userId: number) {
    const project = await projectRepository.findByIdAndUserId(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }

    const photos = await photoRepository.findByProjectId(projectId);

    // Enriquecer fotos com URLs do Drive
    // Para fotógrafo, dar acesso a imagens maiores (mas ainda via thumbnail API para garantir compatibilidade)
    return photos.map((photo) => ({
      ...photo,
      thumbnailUrl: googleDriveService.getThumbnailUrl(photo.driveFileId, 800),
      fullImageUrl: googleDriveService.getThumbnailUrl(photo.driveFileId, 2000), // 2000px para lightbox do fotógrafo
    }));
  }

  async updateProject(projectId: number, userId: number, data: UpdateProjectData): Promise<Project> {
    const project = await projectRepository.findByIdAndUserId(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }

    const updateData: Partial<NewProject> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.packagePhotosCount !== undefined) updateData.packagePhotosCount = data.packagePhotosCount;
    if (data.additionalPhotoPrice !== undefined) updateData.additionalPhotoPrice = data.additionalPhotoPrice.toString();
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await projectRepository.update(projectId, updateData);
    if (!updated) {
      throw new Error('Failed to update project');
    }

    return updated;
  }

  async deleteProject(projectId: number, userId: number): Promise<void> {
    const project = await projectRepository.findByIdAndUserId(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }

    const deleted = await projectRepository.delete(projectId, userId);
    if (!deleted) {
      throw new Error('Failed to delete project');
    }
  }

  async reopenGallery(projectId: number, userId: number): Promise<Project> {
    const project = await projectRepository.findByIdAndUserId(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Deletar todas as seleções antigas do projeto antes de reabrir
    await selectionRepository.deleteByProjectId(projectId);

    const updatedProject = await projectRepository.reopenGallery(projectId, userId);
    if (!updatedProject) {
      throw new Error('Failed to reopen gallery');
    }

    return updatedProject;
  }

  async finalizeProject(projectId: number, userId: number): Promise<Project> {
    const project = await projectRepository.findByIdAndUserId(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }

    const updatedProject = await projectRepository.finalizeProject(projectId, userId);
    if (!updatedProject) {
      throw new Error('Failed to finalize project');
    }

    return updatedProject;
  }

  async getDashboardStats(userId: number) {
    const stats = await projectRepository.getStats(userId);
    const recentProjects = await projectRepository.findByUserId(userId);

    return {
      stats: {
        totalProjects: Number(stats.totalProjects) || 0,
        activeProjects: Number(stats.activeProjects) || 0,
        completedProjects: Number(stats.completedProjects) || 0,
      },
      recentProjects: recentProjects.slice(0, 5),
    };
  }

  private extractDriveFolderId(url: string): string | null {
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /^([a-zA-Z0-9_-]+)$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}

export const projectService = new ProjectService();
