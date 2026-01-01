import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleDriveService } from '../services/drive.service';
import { google } from 'googleapis';
import axios from 'axios';

// Mock das dependências
vi.mock('googleapis');
vi.mock('axios');

describe('GoogleDriveService', () => {
  let service: GoogleDriveService;
  let mockDrive: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock do Google Drive
    mockDrive = {
      files: {
        list: vi.fn(),
        get: vi.fn(),
      },
    };

    (google.drive as any).mockReturnValue(mockDrive);
    (google.auth.GoogleAuth as any).mockImplementation(() => ({}));

    service = new GoogleDriveService();
  });

  describe('extractFolderId', () => {
    it('deve extrair ID de URL padrão do Google Drive', () => {
      const url = 'https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j';
      const result = service.extractFolderId(url);
      expect(result).toBe('1a2b3c4d5e6f7g8h9i0j');
    });

    it('deve extrair ID de URL com user ID', () => {
      const url = 'https://drive.google.com/drive/u/0/folders/1a2b3c4d5e6f7g8h9i0j';
      const result = service.extractFolderId(url);
      expect(result).toBe('1a2b3c4d5e6f7g8h9i0j');
    });

    it('deve extrair ID de URL com parâmetro id', () => {
      const url = 'https://drive.google.com/open?id=1a2b3c4d5e6f7g8h9i0j';
      const result = service.extractFolderId(url);
      expect(result).toBe('1a2b3c4d5e6f7g8h9i0j');
    });

    it('deve retornar ID quando já é um ID puro', () => {
      const id = '1a2b3c4d5e6f7g8h9i0j';
      const result = service.extractFolderId(id);
      expect(result).toBe('1a2b3c4d5e6f7g8h9i0j');
    });

    it('deve retornar null para URL inválida', () => {
      const url = 'https://invalid-url.com/folder';
      const result = service.extractFolderId(url);
      expect(result).toBeNull();
    });
  });

  describe('listImagesFromFolder', () => {
    it('deve listar imagens da pasta com sucesso', async () => {
      const folderId = 'folder123';
      const mockFiles = [
        {
          id: 'file1',
          name: 'foto1.jpg',
          mimeType: 'image/jpeg',
          size: '1024000',
          createdTime: '2024-01-01T00:00:00Z',
          thumbnailLink: 'https://thumbnail1.com',
          webContentLink: 'https://content1.com',
          webViewLink: 'https://view1.com',
        },
        {
          id: 'file2',
          name: 'foto2.png',
          mimeType: 'image/png',
          size: '2048000',
          createdTime: '2024-01-02T00:00:00Z',
        },
      ];

      mockDrive.files.list.mockResolvedValue({
        data: { files: mockFiles },
      });

      const result = await service.listImagesFromFolder(folderId);

      expect(mockDrive.files.list).toHaveBeenCalledWith({
        q: `'${folderId}' in parents and (mimeType contains 'image/') and trashed = false`,
        fields: 'files(id, name, mimeType, size, createdTime, thumbnailLink, webContentLink, webViewLink)',
        orderBy: 'name',
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'file1',
        name: 'foto1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        createdTime: '2024-01-01T00:00:00Z',
        thumbnailLink: 'https://thumbnail1.com',
        webContentLink: 'https://content1.com',
        webViewLink: 'https://view1.com',
      });
    });

    it('deve retornar array vazio quando não há imagens', async () => {
      const folderId = 'folder123';

      mockDrive.files.list.mockResolvedValue({
        data: { files: [] },
      });

      const result = await service.listImagesFromFolder(folderId);

      expect(result).toEqual([]);
    });

    it('deve lançar erro 404 quando pasta não é encontrada', async () => {
      const folderId = 'invalid-folder';

      const error = new Error('Not found');
      (error as any).code = 404;
      mockDrive.files.list.mockRejectedValue(error);

      await expect(service.listImagesFromFolder(folderId)).rejects.toThrow(
        'Pasta não encontrada. Certifique-se de que a pasta existe e está com compartilhamento público ativado.'
      );
    });

    it('deve lançar erro 403 quando não há permissão', async () => {
      const folderId = 'private-folder';

      const error = new Error('Forbidden');
      (error as any).code = 403;
      mockDrive.files.list.mockRejectedValue(error);

      await expect(service.listImagesFromFolder(folderId)).rejects.toThrow(
        'Sem permissão para acessar a pasta. A pasta precisa estar com compartilhamento público (qualquer pessoa com o link pode visualizar).'
      );
    });

    it('deve lançar erro genérico para outros erros', async () => {
      const folderId = 'folder123';

      const error = new Error('Network error');
      mockDrive.files.list.mockRejectedValue(error);

      await expect(service.listImagesFromFolder(folderId)).rejects.toThrow(
        'Erro ao acessar Google Drive: Network error'
      );
    });
  });

  describe('getImageDownloadUrl', () => {
    it('deve retornar webContentLink quando disponível', async () => {
      const fileId = 'file123';
      const mockResponse = {
        data: {
          webContentLink: 'https://content-link.com',
          webViewLink: 'https://view-link.com',
        },
      };

      mockDrive.files.get.mockResolvedValue(mockResponse);

      const result = await service.getImageDownloadUrl(fileId);

      expect(mockDrive.files.get).toHaveBeenCalledWith({
        fileId,
        fields: 'webContentLink, webViewLink',
        supportsAllDrives: true,
      });
      expect(result).toBe('https://content-link.com');
    });

    it('deve retornar webViewLink quando webContentLink não está disponível', async () => {
      const fileId = 'file123';
      const mockResponse = {
        data: {
          webContentLink: null,
          webViewLink: 'https://view-link.com',
        },
      };

      mockDrive.files.get.mockResolvedValue(mockResponse);

      const result = await service.getImageDownloadUrl(fileId);

      expect(result).toBe('https://view-link.com');
    });

    it('deve retornar URL de fallback quando ambas as links falham', async () => {
      const fileId = 'file123';
      const mockResponse = {
        data: {
          webContentLink: null,
          webViewLink: null,
        },
      };

      mockDrive.files.get.mockResolvedValue(mockResponse);

      const result = await service.getImageDownloadUrl(fileId);

      expect(result).toBe('https://drive.google.com/uc?id=file123&export=download');
    });

    it('deve retornar URL de fallback quando API falha', async () => {
      const fileId = 'file123';

      mockDrive.files.get.mockRejectedValue(new Error('API error'));

      const result = await service.getImageDownloadUrl(fileId);

      expect(result).toBe('https://drive.google.com/uc?id=file123&export=download');
    });
  });

  describe('getThumbnailUrl', () => {
    it('deve gerar URL de thumbnail com tamanho padrão', () => {
      const fileId = 'file123';
      const result = service.getThumbnailUrl(fileId);
      expect(result).toBe('https://drive.google.com/thumbnail?id=file123&sz=w800');
    });

    it('deve gerar URL de thumbnail com tamanho customizado', () => {
      const fileId = 'file123';
      const result = service.getThumbnailUrl(fileId, 600);
      expect(result).toBe('https://drive.google.com/thumbnail?id=file123&sz=w600');
    });
  });

  describe('getWatermarkedThumbnailUrl', () => {
    it('deve gerar URL de thumbnail com marca d\'água', () => {
      const fileId = 'file123';
      const result = service.getWatermarkedThumbnailUrl(fileId);
      expect(result).toBe('https://drive.google.com/thumbnail?id=file123&sz=w400');
    });
  });

  describe('getWatermarkedLightboxUrl', () => {
    it('deve gerar URL de lightbox com marca d\'água', () => {
      const fileId = 'file123';
      const result = service.getWatermarkedLightboxUrl(fileId);
      expect(result).toBe('https://drive.google.com/thumbnail?id=file123&sz=w1200');
    });
  });

  describe('getDirectDownloadUrl', () => {
    it('deve gerar URL de download direto', () => {
      const fileId = 'file123';
      const result = service.getDirectDownloadUrl(fileId);
      expect(result).toBe('https://drive.google.com/uc?export=download&id=file123');
    });
  });

  describe('checkFolderAccess', () => {
    it('deve retornar true quando tem acesso à pasta', async () => {
      const folderId = 'folder123';
      const mockResponse = {
        data: { id: 'folder123', name: 'Test Folder' },
      };

      mockDrive.files.get.mockResolvedValue(mockResponse);

      const result = await service.checkFolderAccess(folderId);

      expect(result).toBe(true);
      expect(mockDrive.files.get).toHaveBeenCalledWith({
        fileId: folderId,
        fields: 'id, name',
        supportsAllDrives: true,
      });
    });

    it('deve retornar false quando não tem acesso à pasta', async () => {
      const folderId = 'folder123';

      mockDrive.files.get.mockRejectedValue(new Error('Access denied'));

      const result = await service.checkFolderAccess(folderId);

      expect(result).toBe(false);
    });
  });

  describe('getFolderMetadata', () => {
    it('deve obter metadados da pasta com sucesso', async () => {
      const folderId = 'folder123';
      const mockResponse = {
        data: {
          id: 'folder123',
          name: 'Test Folder',
          createdTime: '2024-01-01T00:00:00Z',
          modifiedTime: '2024-01-02T00:00:00Z',
        },
      };

      mockDrive.files.get.mockResolvedValue(mockResponse);

      const result = await service.getFolderMetadata(folderId);

      expect(result).toEqual({
        id: 'folder123',
        name: 'Test Folder',
        createdTime: '2024-01-01T00:00:00Z',
        modifiedTime: '2024-01-02T00:00:00Z',
      });
    });

    it('deve lançar erro quando falha ao obter metadados', async () => {
      const folderId = 'folder123';

      mockDrive.files.get.mockRejectedValue(new Error('API error'));

      await expect(service.getFolderMetadata(folderId)).rejects.toThrow(
        'Erro ao obter metadados da pasta: API error'
      );
    });
  });

  describe('getPublicImageUrl', () => {
    it('deve gerar URL pública da imagem', () => {
      const fileId = 'file123';
      const result = service.getPublicImageUrl(fileId);
      expect(result).toBe('https://drive.google.com/uc?id=file123&export=view');
    });
  });

  describe('downloadFile', () => {
    it('deve baixar arquivo com sucesso', async () => {
      const fileId = 'file123';
      const mockBuffer = Buffer.from('file content');

      (axios.get as any).mockResolvedValue({
        data: mockBuffer,
      });

      const result = await service.downloadFile(fileId);

      expect(axios.get).toHaveBeenCalledWith(
        'https://drive.google.com/uc?export=download&id=file123',
        {
          responseType: 'arraybuffer',
          maxRedirects: 5,
        }
      );
      expect(result).toEqual(mockBuffer);
    });

    it('deve lançar erro quando download falha', async () => {
      const fileId = 'file123';

      (axios.get as any).mockRejectedValue(new Error('Download failed'));

      await expect(service.downloadFile(fileId)).rejects.toThrow(
        'Erro ao baixar arquivo do Drive: Download failed'
      );
    });
  });
});