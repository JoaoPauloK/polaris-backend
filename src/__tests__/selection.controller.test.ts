import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SelectionController } from '../controllers/selection.controller';
import { selectionService } from '../services/selection.service';

// Mock das dependências
vi.mock('../services/selection.service');

describe('SelectionController', () => {
  let controller: SelectionController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new SelectionController();

    mockReq = {
      user: { userId: 1 },
      params: {},
      body: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    };

    mockNext = vi.fn();
  });

  describe('create', () => {
    it('deve criar seleção com sucesso', async () => {
      const validData = {
        projectToken: '123e4567-e89b-12d3-a456-426614174000',
        clientName: 'João Silva',
        clientEmail: 'joao@email.com',
        clientPhone: '11999999999',
        photoIds: [1, 2, 3],
        notes: 'Seleção de fotos',
      };

      mockReq.body = validData;

      const mockSelection = {
        id: 1,
        clientName: 'João Silva',
        selectedPhotosCount: 3,
      };

      (selectionService.createSelection as any).mockResolvedValue(mockSelection);

      await controller.create(mockReq, mockRes, mockNext);

      expect(selectionService.createSelection).toHaveBeenCalledWith(validData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Selection created successfully',
        data: { selection: mockSelection },
      });
    });

    it('deve retornar erro de validação para dados inválidos', async () => {
      const invalidData = {
        projectToken: 'invalid-token',
        clientName: '',
        clientEmail: 'invalid-email',
        photoIds: [],
      };

      mockReq.body = invalidData;

      await controller.create(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: expect.any(Array),
      });
    });
  });

  describe('getByProject', () => {
    it('deve retornar seleções do projeto', async () => {
      mockReq.params.projectId = '1';

      const mockSelections = [
        { id: 1, clientName: 'Cliente 1' },
        { id: 2, clientName: 'Cliente 2' },
      ];

      (selectionService.getSelectionsByProject as any).mockResolvedValue(mockSelections);

      await controller.getByProject(mockReq, mockRes, mockNext);

      expect(selectionService.getSelectionsByProject).toHaveBeenCalledWith(1, 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { selections: mockSelections },
      });
    });

    it('deve retornar erro para ID de projeto inválido', async () => {
      mockReq.params.projectId = 'invalid';

      await controller.getByProject(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid project ID',
      });
    });
  });

  describe('getOne', () => {
    it('deve retornar seleção por ID', async () => {
      mockReq.params.id = '1';

      const mockSelection = {
        id: 1,
        clientName: 'João Silva',
        selectedPhotosCount: 3,
      };

      (selectionService.getSelection as any).mockResolvedValue(mockSelection);

      await controller.getOne(mockReq, mockRes, mockNext);

      expect(selectionService.getSelection).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { selection: mockSelection },
      });
    });

    it('deve retornar erro para ID de seleção inválido', async () => {
      mockReq.params.id = 'invalid';

      await controller.getOne(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid selection ID',
      });
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar status da seleção', async () => {
      mockReq.params.id = '1';
      mockReq.body = { status: 'confirmed' };

      const mockSelection = {
        id: 1,
        status: 'confirmed',
      };

      (selectionService.updateSelectionStatus as any).mockResolvedValue(mockSelection);

      await controller.updateStatus(mockReq, mockRes, mockNext);

      expect(selectionService.updateSelectionStatus).toHaveBeenCalledWith(1, 1, 'confirmed');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Selection status updated successfully',
        data: { selection: mockSelection },
      });
    });

    it('deve retornar erro para ID de seleção inválido', async () => {
      mockReq.params.id = 'invalid';
      mockReq.body = { status: 'confirmed' };

      await controller.updateStatus(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid selection ID',
      });
    });

    it('deve retornar erro de validação para status inválido', async () => {
      mockReq.params.id = '1';
      mockReq.body = { status: 'invalid-status' };

      await controller.updateStatus(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: expect.any(Array),
      });
    });
  });

  describe('delete', () => {
    it('deve deletar seleção com sucesso', async () => {
      mockReq.params.id = '1';

      (selectionService.deleteSelection as any).mockResolvedValue(undefined);

      await controller.delete(mockReq, mockRes, mockNext);

      expect(selectionService.deleteSelection).toHaveBeenCalledWith(1, 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Selection deleted successfully',
      });
    });

    it('deve retornar erro para ID de seleção inválido', async () => {
      mockReq.params.id = 'invalid';

      await controller.delete(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid selection ID',
      });
    });
  });

  describe('downloadZip', () => {
    it('deve fazer download do ZIP da seleção', async () => {
      mockReq.params.id = '1';

      (selectionService.downloadSelectionAsZip as any).mockResolvedValue(undefined);

      await controller.downloadZip(mockReq, mockRes, mockNext);

      expect(selectionService.downloadSelectionAsZip).toHaveBeenCalledWith(1, 1, mockRes);
    });

    it('deve retornar erro para ID de seleção inválido', async () => {
      mockReq.params.id = 'invalid';

      await controller.downloadZip(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid selection ID',
      });
    });
  });
});