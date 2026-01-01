import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GalleryController } from '../controllers/gallery.controller';
import { projectService } from '../services/project.service';

// Mock das dependências
vi.mock('../services/project.service');

describe('GalleryController', () => {
  let controller: GalleryController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new GalleryController();

    mockReq = {
      params: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('getGallery', () => {
    it('deve retornar galeria com sucesso', async () => {
      mockReq.params.token = 'gallery-token-123';

      const mockGallery = {
        id: 1,
        name: 'Projeto Teste',
        galleryStatus: 'open',
        photos: [
          { id: 1, driveFileName: 'foto1.jpg' },
          { id: 2, driveFileName: 'foto2.jpg' },
        ],
      };

      (projectService.getProjectByToken as any).mockResolvedValue(mockGallery);

      await controller.getGallery(mockReq, mockRes, mockNext);

      expect(projectService.getProjectByToken).toHaveBeenCalledWith('gallery-token-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockGallery,
      });
    });

    it('deve retornar erro quando token não é fornecido', async () => {
      mockReq.params.token = undefined;

      await controller.getGallery(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Gallery token is required',
      });
    });

    it('deve chamar next com erro quando service falha', async () => {
      mockReq.params.token = 'invalid-token';

      const mockError = new Error('Gallery not found');
      (projectService.getProjectByToken as any).mockRejectedValue(mockError);

      await controller.getGallery(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });
});