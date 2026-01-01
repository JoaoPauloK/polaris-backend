import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DriveController } from '../controllers/drive.controller';
import { googleDriveService } from '../services/drive.service';
import { imageProcessingService } from '../services/image.service';
import { photoRepository } from '../repositories/photo.repository';
import { projectRepository } from '../repositories/project.repository';

// Mock das dependências
vi.mock('../services/drive.service');
vi.mock('../services/image.service');
vi.mock('../repositories/photo.repository');
vi.mock('../repositories/project.repository');

describe('DriveController', () => {
  let controller: DriveController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new DriveController();

    mockReq = {
      user: { userId: 1 },
      params: {},
      body: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('syncPhotos', () => {
    it('deve sincronizar fotos com sucesso', async () => {
      mockReq.params.projectId = '1';

      const mockProject = {
        id: 1,
        driveFolderId: 'folder123',
      };

      const mockDriveImages = [
        { id: 'file1', name: 'foto1.jpg', size: 1024000 },
        { id: 'file2', name: 'foto2.jpg', size: 2048000 },
      ];

      (projectRepository.findByIdAndUserId as any).mockResolvedValue(mockProject);
      (googleDriveService.listImagesFromFolder as any).mockResolvedValue(mockDriveImages);
      (photoRepository.findByProjectId as any).mockResolvedValue([]);
      (googleDriveService.getPublicImageUrl as any).mockReturnValue('https://public-url.com');
      (googleDriveService.getThumbnailUrl as any).mockReturnValue('https://thumbnail-url.com');
      (photoRepository.create as any).mockResolvedValue(undefined);

      await controller.syncPhotos(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully synced 2 of 2 images',
        data: {
          syncedCount: 2,
          totalImages: 2,
        },
      });
    });

    it('deve retornar erro para ID de projeto inválido', async () => {
      mockReq.params.projectId = 'invalid';

      await controller.syncPhotos(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid project ID',
      });
    });

    it('deve retornar erro quando projeto não é encontrado', async () => {
      mockReq.params.projectId = '1';

      (projectRepository.findByIdAndUserId as any).mockResolvedValue(null);

      await controller.syncPhotos(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Project not found',
      });
    });

    it('deve retornar erro quando projeto não tem pasta configurada', async () => {
      mockReq.params.projectId = '1';

      const mockProject = {
        id: 1,
        driveFolderId: null,
      };

      (projectRepository.findByIdAndUserId as any).mockResolvedValue(mockProject);

      await controller.syncPhotos(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Project does not have a Google Drive folder configured',
      });
    });

    it('deve retornar mensagem quando não há imagens na pasta', async () => {
      mockReq.params.projectId = '1';

      const mockProject = {
        id: 1,
        driveFolderId: 'folder123',
      };

      (projectRepository.findByIdAndUserId as any).mockResolvedValue(mockProject);
      (googleDriveService.listImagesFromFolder as any).mockResolvedValue([]);

      await controller.syncPhotos(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'No images found in the Google Drive folder',
        data: { syncedCount: 0, totalImages: 0 },
      });
    });

    it('deve pular fotos que já existem', async () => {
      mockReq.params.projectId = '1';

      const mockProject = {
        id: 1,
        driveFolderId: 'folder123',
      };

      const mockDriveImages = [
        { id: 'file1', name: 'foto1.jpg', size: 1024000 },
      ];

      const mockExistingPhotos = [
        { driveFileId: 'file1' },
      ];

      (projectRepository.findByIdAndUserId as any).mockResolvedValue(mockProject);
      (googleDriveService.listImagesFromFolder as any).mockResolvedValue(mockDriveImages);
      (photoRepository.findByProjectId as any).mockResolvedValue(mockExistingPhotos);

      await controller.syncPhotos(mockReq, mockRes, mockNext);

      expect(photoRepository.create).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully synced 0 of 1 images',
        data: {
          syncedCount: 0,
          totalImages: 1,
        },
      });
    });

    it('deve continuar processando quando uma foto falha', async () => {
      mockReq.params.projectId = '1';

      const mockProject = {
        id: 1,
        driveFolderId: 'folder123',
      };

      const mockDriveImages = [
        { id: 'file1', name: 'foto1.jpg', size: 1024000 },
        { id: 'file2', name: 'foto2.jpg', size: 2048000 },
      ];

      (projectRepository.findByIdAndUserId as any).mockResolvedValue(mockProject);
      (googleDriveService.listImagesFromFolder as any).mockResolvedValue(mockDriveImages);
      (photoRepository.findByProjectId as any).mockResolvedValue([]);

      // Primeira chamada falha, segunda succeeds
      (photoRepository.create as any)
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(undefined);

      (googleDriveService.getPublicImageUrl as any).mockReturnValue('https://public-url.com');
      (googleDriveService.getThumbnailUrl as any).mockReturnValue('https://thumbnail-url.com');

      await controller.syncPhotos(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully synced 1 of 2 images',
        data: {
          syncedCount: 1,
          totalImages: 2,
          errors: ['foto1.jpg: Database error'],
        },
      });
    });
  });

  describe('checkAccess', () => {
    it('deve verificar acesso com sucesso', async () => {
      mockReq.params.folderId = 'folder123';

      const mockMetadata = {
        id: 'folder123',
        name: 'Test Folder',
        createdTime: '2024-01-01T00:00:00Z',
      };

      (googleDriveService.checkFolderAccess as any).mockResolvedValue(true);
      (googleDriveService.getFolderMetadata as any).mockResolvedValue(mockMetadata);

      await controller.checkAccess(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Folder is accessible',
        data: { metadata: mockMetadata },
      });
    });

    it('deve retornar erro quando folderId não é fornecido', async () => {
      mockReq.params.folderId = undefined;

      await controller.checkAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Folder ID is required',
      });
    });

    it('deve retornar erro quando não tem acesso à pasta', async () => {
      mockReq.params.folderId = 'folder123';

      (googleDriveService.checkFolderAccess as any).mockResolvedValue(false);

      await controller.checkAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot access the folder. Make sure it is publicly shared.',
      });
    });
  });

  describe('previewFolder', () => {
    it('deve fazer preview da pasta com sucesso', async () => {
      mockReq.params.folderId = 'folder123';

      const mockImages = [
        { id: 'file1', name: 'foto1.jpg' },
        { id: 'file2', name: 'foto2.jpg' },
        { id: 'file3', name: 'foto3.jpg' },
      ];

      (googleDriveService.listImagesFromFolder as any).mockResolvedValue(mockImages);

      await controller.previewFolder(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          count: 3,
          images: mockImages.slice(0, 10),
        },
      });
    });

    it('deve retornar erro quando folderId não é fornecido', async () => {
      mockReq.params.folderId = undefined;

      await controller.previewFolder(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Folder ID is required',
      });
    });
  });
});