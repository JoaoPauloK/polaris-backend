import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SelectionService } from '../services/selection.service';
import { selectionRepository } from '../repositories/selection.repository';
import { projectRepository } from '../repositories/project.repository';
import { photoRepository } from '../repositories/photo.repository';
import { googleDriveService } from '../services/drive.service';

// Mock das dependências
vi.mock('../repositories/selection.repository');
vi.mock('../repositories/project.repository');
vi.mock('../repositories/photo.repository');
vi.mock('../services/drive.service');

describe('SelectionService', () => {
  let service: SelectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SelectionService();
  });

  describe('createSelection', () => {
    it('deve criar seleção com sucesso', async () => {
      const mockData = {
        projectToken: 'token123',
        clientName: 'João Silva',
        clientEmail: 'joao@email.com',
        clientPhone: '11999999999',
        photoIds: [1, 2, 3],
        notes: 'Seleção de fotos',
      };

      const mockProject = {
        id: 1,
        galleryStatus: 'open',
        packagePhotosCount: 5,
        additionalPhotoPrice: '10.00',
      };

      const mockPhotos = [
        { id: 1, projectId: 1, driveFileId: 'file1' },
        { id: 2, projectId: 1, driveFileId: 'file2' },
        { id: 3, projectId: 1, driveFileId: 'file3' },
      ];

      const mockSelection = {
        id: 1,
        projectId: 1,
        clientName: 'João Silva',
        clientEmail: 'joao@email.com',
        selectedPhotosCount: 3,
        additionalPhotosCount: 0,
        totalPrice: '0.00',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (projectRepository.findByGalleryToken as any).mockResolvedValue(mockProject);
      (photoRepository.findByIds as any).mockResolvedValue(mockPhotos);
      (selectionRepository.create as any).mockResolvedValue(mockSelection);
      (selectionRepository.addSelectedPhotos as any).mockResolvedValue(undefined);
      (projectRepository.closeGallery as any).mockResolvedValue(undefined);
      (selectionRepository.findById as any).mockResolvedValue({
        ...mockSelection,
        selectedPhotos: [],
      });

      const result = await service.createSelection(mockData);

      expect(projectRepository.findByGalleryToken).toHaveBeenCalledWith('token123');
      expect(photoRepository.findByIds).toHaveBeenCalledWith([1, 2, 3]);
      expect(selectionRepository.create).toHaveBeenCalled();
      expect(selectionRepository.addSelectedPhotos).toHaveBeenCalledWith(1, [1, 2, 3]);
      expect(projectRepository.closeGallery).toHaveBeenCalledWith(1);
      expect(result.clientName).toBe('João Silva');
      expect(result.selectedPhotosCount).toBe(3);
    });

    it('deve lançar erro quando projeto não é encontrado', async () => {
      const mockData = {
        projectToken: 'invalid-token',
        clientName: 'João Silva',
        clientEmail: 'joao@email.com',
        photoIds: [1, 2, 3],
      };

      (projectRepository.findByGalleryToken as any).mockResolvedValue(null);

      await expect(service.createSelection(mockData)).rejects.toThrow('Project not found');
    });

    it('deve lançar erro quando galeria está fechada', async () => {
      const mockData = {
        projectToken: 'token123',
        clientName: 'João Silva',
        clientEmail: 'joao@email.com',
        photoIds: [1, 2, 3],
      };

      const mockProject = {
        id: 1,
        galleryStatus: 'closed',
      };

      (projectRepository.findByGalleryToken as any).mockResolvedValue(mockProject);

      await expect(service.createSelection(mockData)).rejects.toThrow('Gallery is closed');
    });

    it('deve lançar erro quando fotos não pertencem ao projeto', async () => {
      const mockData = {
        projectToken: 'token123',
        clientName: 'João Silva',
        clientEmail: 'joao@email.com',
        photoIds: [1, 2, 3],
      };

      const mockProject = {
        id: 1,
        galleryStatus: 'open',
        packagePhotosCount: 5,
        additionalPhotoPrice: '10.00',
      };

      const mockPhotos = [
        { id: 1, projectId: 1, driveFileId: 'file1' },
        { id: 2, projectId: 2, driveFileId: 'file2' }, // Foto de outro projeto
      ];

      (projectRepository.findByGalleryToken as any).mockResolvedValue(mockProject);
      (photoRepository.findByIds as any).mockResolvedValue(mockPhotos);

      await expect(service.createSelection(mockData)).rejects.toThrow('Some photos do not belong to this project');
    });

    it('deve calcular preço adicional corretamente', async () => {
      const mockData = {
        projectToken: 'token123',
        clientName: 'João Silva',
        clientEmail: 'joao@email.com',
        photoIds: [1, 2, 3, 4, 5, 6, 7], // 7 fotos
      };

      const mockProject = {
        id: 1,
        galleryStatus: 'open',
        packagePhotosCount: 5, // Pacote inclui 5 fotos
        additionalPhotoPrice: '15.50', // R$ 15,50 por foto adicional
      };

      const mockPhotos = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        projectId: 1,
        driveFileId: `file${i + 1}`,
      }));

      const mockSelection = {
        id: 1,
        projectId: 1,
        clientName: 'João Silva',
        clientEmail: 'joao@email.com',
        selectedPhotosCount: 7,
        additionalPhotosCount: 2, // 7 - 5 = 2 adicionais
        totalPrice: '31.00', // 2 * 15.50 = 31.00
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (projectRepository.findByGalleryToken as any).mockResolvedValue(mockProject);
      (photoRepository.findByIds as any).mockResolvedValue(mockPhotos);
      (selectionRepository.create as any).mockResolvedValue(mockSelection);
      (selectionRepository.addSelectedPhotos as any).mockResolvedValue(undefined);
      (projectRepository.closeGallery as any).mockResolvedValue(undefined);
      (selectionRepository.findById as any).mockResolvedValue({
        ...mockSelection,
        selectedPhotos: [],
      });

      const result = await service.createSelection(mockData);

      expect(result.additionalPhotosCount).toBe(2);
      expect(result.totalPrice).toBe('31.00');
    });
  });

  describe('getSelectionsByProject', () => {
    it('deve retornar seleções do projeto', async () => {
      const projectId = 1;
      const userId = 1;

      const mockProject = { id: 1, name: 'Projeto Teste' };
      const mockSelections = [
        {
          id: 1,
          projectId: 1,
          clientName: 'Cliente 1',
          selectedPhotos: [
            { photo: { id: 1, driveFileId: 'file1', driveFileName: 'foto1.jpg' } },
          ],
        },
      ];

      (projectRepository.findByIdAndUserId as any).mockResolvedValue(mockProject);
      (selectionRepository.findByProjectId as any).mockResolvedValue(mockSelections);
      (googleDriveService.getDirectDownloadUrl as any).mockReturnValue('https://download.url/foto1.jpg');

      const result = await service.getSelectionsByProject(projectId, userId);

      expect(projectRepository.findByIdAndUserId).toHaveBeenCalledWith(1, 1);
      expect(selectionRepository.findByProjectId).toHaveBeenCalledWith(1);
      expect(result[0].photos[0].downloadUrl).toBe('https://download.url/foto1.jpg');
    });

    it('deve lançar erro quando projeto não pertence ao usuário', async () => {
      const projectId = 1;
      const userId = 1;

      (projectRepository.findByIdAndUserId as any).mockResolvedValue(null);

      await expect(service.getSelectionsByProject(projectId, userId)).rejects.toThrow('Project not found');
    });
  });

  describe('getSelection', () => {
    it('deve retornar seleção por ID', async () => {
      const selectionId = 1;
      const mockSelection = {
        id: 1,
        projectId: 1,
        clientName: 'Cliente 1',
        selectedPhotos: [
          { photo: { id: 1, driveFileName: 'foto1.jpg' } },
        ],
      };

      (selectionRepository.findById as any).mockResolvedValue(mockSelection);

      const result = await service.getSelection(selectionId);

      expect(selectionRepository.findById).toHaveBeenCalledWith(1);
      expect(result.id).toBe(1);
      expect(result.photos[0].id).toBe(1);
    });

    it('deve lançar erro quando seleção não é encontrada', async () => {
      const selectionId = 1;

      (selectionRepository.findById as any).mockResolvedValue(null);

      await expect(service.getSelection(selectionId)).rejects.toThrow('Selection not found');
    });
  });

  describe('updateSelectionStatus', () => {
    it('deve atualizar status da seleção', async () => {
      const selectionId = 1;
      const userId = 1;
      const newStatus = 'approved';

      const mockSelection = { id: 1, projectId: 1 };
      const mockProject = { id: 1 };
      const mockUpdatedSelection = { id: 1, status: 'approved' };

      (selectionRepository.findById as any).mockResolvedValue(mockSelection);
      (projectRepository.findByIdAndUserId as any).mockResolvedValue(mockProject);
      (selectionRepository.update as any).mockResolvedValue(mockUpdatedSelection);

      const result = await service.updateSelectionStatus(selectionId, userId, newStatus);

      expect(selectionRepository.update).toHaveBeenCalledWith(1, { status: 'approved' });
      expect(result.status).toBe('approved');
    });

    it('deve lançar erro quando seleção não é encontrada', async () => {
      const selectionId = 1;
      const userId = 1;
      const newStatus = 'approved';

      (selectionRepository.findById as any).mockResolvedValue(null);

      await expect(service.updateSelectionStatus(selectionId, userId, newStatus)).rejects.toThrow('Selection not found');
    });

    it('deve lançar erro quando usuário não tem permissão', async () => {
      const selectionId = 1;
      const userId = 1;
      const newStatus = 'approved';

      const mockSelection = { id: 1, projectId: 1 };

      (selectionRepository.findById as any).mockResolvedValue(mockSelection);
      (projectRepository.findByIdAndUserId as any).mockResolvedValue(null);

      await expect(service.updateSelectionStatus(selectionId, userId, newStatus)).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteSelection', () => {
    it('deve deletar seleção com sucesso', async () => {
      const selectionId = 1;
      const userId = 1;

      const mockSelection = { id: 1, projectId: 1 };
      const mockProject = { id: 1 };

      (selectionRepository.findById as any).mockResolvedValue(mockSelection);
      (projectRepository.findByIdAndUserId as any).mockResolvedValue(mockProject);
      (selectionRepository.delete as any).mockResolvedValue(true);

      await expect(service.deleteSelection(selectionId, userId)).resolves.toBeUndefined();

      expect(selectionRepository.delete).toHaveBeenCalledWith(1);
    });

    it('deve lançar erro quando seleção não é encontrada', async () => {
      const selectionId = 1;
      const userId = 1;

      (selectionRepository.findById as any).mockResolvedValue(null);

      await expect(service.deleteSelection(selectionId, userId)).rejects.toThrow('Selection not found');
    });

    it('deve lançar erro quando usuário não tem permissão', async () => {
      const selectionId = 1;
      const userId = 1;

      const mockSelection = { id: 1, projectId: 1 };

      (selectionRepository.findById as any).mockResolvedValue(mockSelection);
      (projectRepository.findByIdAndUserId as any).mockResolvedValue(null);

      await expect(service.deleteSelection(selectionId, userId)).rejects.toThrow('Unauthorized');
    });
  });
});