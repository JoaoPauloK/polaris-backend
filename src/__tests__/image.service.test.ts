import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ImageProcessingService } from '../services/image.service';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import axios from 'axios';

// Mock das dependências
vi.mock('fs/promises');
vi.mock('sharp');
vi.mock('axios');

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ImageProcessingService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('downloadImageFromUrl', () => {
    it('deve baixar imagem com sucesso', async () => {
      const mockUrl = 'https://example.com/image.jpg';
      const mockBuffer = Buffer.from('fake image data');

      (axios.get as any).mockResolvedValue({
        data: mockBuffer,
      });

      const result = await service.downloadImageFromUrl(mockUrl);

      expect(axios.get).toHaveBeenCalledWith(mockUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Polaris/1.0)',
        },
      });
      expect(result).toEqual(mockBuffer);
    });

    it('deve lançar erro quando download falha', async () => {
      const mockUrl = 'https://example.com/image.jpg';
      const mockError = new Error('Network error');

      (axios.get as any).mockRejectedValue(mockError);

      await expect(service.downloadImageFromUrl(mockUrl)).rejects.toThrow(
        'Erro ao baixar imagem: Network error'
      );
    });
  });

  describe('generateThumbnail', () => {
    it('deve gerar thumbnail com sucesso', async () => {
      const mockImageBuffer = Buffer.from('fake image');
      const mockThumbnailBuffer = Buffer.from('thumbnail data');
      const mockSharpInstance = {
        resize: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(mockThumbnailBuffer),
      };

      (sharp as any).mockReturnValue(mockSharpInstance);

      const result = await service.generateThumbnail(mockImageBuffer, 400);

      expect(sharp).toHaveBeenCalledWith(mockImageBuffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(400, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 80,
        progressive: true,
      });
      expect(result).toEqual(mockThumbnailBuffer);
    });

    it('deve lançar erro quando geração de thumbnail falha', async () => {
      const mockImageBuffer = Buffer.from('fake image');
      const mockError = new Error('Sharp error');

      (sharp as any).mockImplementation(() => {
        throw mockError;
      });

      await expect(service.generateThumbnail(mockImageBuffer)).rejects.toThrow(
        'Erro ao gerar thumbnail: Sharp error'
      );
    });
  });

  describe('generateWatermarkedImage', () => {
    it('deve gerar imagem com marca d\'água', async () => {
      const mockImageBuffer = Buffer.from('fake image');
      const mockWatermarkedBuffer = Buffer.from('watermarked image');
      const mockMetadata = { width: 1000, height: 800 };

      const mockSharpInstance = {
        metadata: vi.fn().mockResolvedValue(mockMetadata),
        resize: vi.fn().mockReturnThis(),
        toBuffer: vi.fn()
          .mockResolvedValueOnce(mockImageBuffer) // Primeiro toBuffer (resize)
          .mockResolvedValueOnce(mockWatermarkedBuffer), // Segundo toBuffer (final)
        composite: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
      };

      (sharp as any).mockReturnValueOnce(mockSharpInstance);
      (sharp as any).mockReturnValueOnce(mockSharpInstance);
      (sharp as any).mockReturnValueOnce(mockSharpInstance);
      (sharp as any).mockReturnValueOnce(mockSharpInstance);

      const result = await service.generateWatermarkedImage(mockImageBuffer);

      expect(result).toEqual(mockWatermarkedBuffer);
      expect(mockSharpInstance.composite).toHaveBeenCalled();
    });

    it('deve usar opções customizadas', async () => {
      const mockImageBuffer = Buffer.from('fake image');
      const mockWatermarkedBuffer = Buffer.from('watermarked image');
      const mockMetadata = { width: 1000, height: 800 };

      const mockSharpInstance = {
        metadata: vi.fn().mockResolvedValue(mockMetadata),
        resize: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(mockImageBuffer),
        composite: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
      };

      (sharp as any).mockReturnValueOnce(mockSharpInstance);
      (sharp as any).mockReturnValueOnce(mockSharpInstance);
      (sharp as any).mockReturnValueOnce(mockSharpInstance);
      (sharp as any).mockReturnValueOnce(mockSharpInstance);
      (sharp as any).mockReturnValueOnce(mockSharpInstance);

      const options = {
        width: 600,
        quality: 80,
        watermarkText: 'CUSTOM WATERMARK',
        watermarkOpacity: 0.5,
        watermarkSize: 36,
      };

      await service.generateWatermarkedImage(mockImageBuffer, options);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(600, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    });
  });

  describe('saveImage', () => {
    it('deve salvar imagem com sucesso', async () => {
      const mockImageBuffer = Buffer.from('fake image');
      const filename = 'test.jpg';
      const expectedPath = 'test.jpg';

      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);

      const result = await service.saveImage(mockImageBuffer, filename);

      expect(fs.mkdir).toHaveBeenCalledWith('./uploads', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(path.join('./uploads', filename), mockImageBuffer);
      expect(result).toEqual(expectedPath);
    });

    it('deve salvar imagem em subdiretório', async () => {
      const mockImageBuffer = Buffer.from('fake image');
      const filename = 'test.jpg';
      const subdir = 'thumbnails';
      const expectedPath = path.join('thumbnails', 'test.jpg');

      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);

      const result = await service.saveImage(mockImageBuffer, filename, subdir);

      expect(fs.mkdir).toHaveBeenCalledWith(path.join('./uploads', subdir), { recursive: true });
      expect(result).toEqual(expectedPath);
    });

    it('deve lançar erro quando salvamento falha', async () => {
      const mockImageBuffer = Buffer.from('fake image');
      const filename = 'test.jpg';
      const mockError = new Error('Write error');

      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockRejectedValue(mockError);

      await expect(service.saveImage(mockImageBuffer, filename)).rejects.toThrow(
        'Erro ao salvar imagem: Write error'
      );
    });
  });

  describe('processGoogleDriveImage', () => {
    it('deve processar imagem do Google Drive com sucesso', async () => {
      const imageUrl = 'https://drive.google.com/image.jpg';
      const fileId = 'file123';
      const projectId = 1;
      const mockImageBuffer = Buffer.from('fake image');
      const mockThumbnailBuffer = Buffer.from('thumbnail');
      const mockWatermarkedBuffer = Buffer.from('watermarked');

      // Mock download
      (axios.get as any).mockResolvedValue({ data: mockImageBuffer });

      // Mock sharp operations
      const mockSharpInstance = {
        resize: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(mockThumbnailBuffer),
        metadata: vi.fn().mockResolvedValue({ width: 1000, height: 800 }),
        composite: vi.fn().mockReturnThis(),
      };

      (sharp as any).mockReturnValue(mockSharpInstance);

      // Mock fs operations
      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);

      const result = await service.processGoogleDriveImage(imageUrl, fileId, projectId);

      expect(result).toEqual({
        thumbnailPath: 'thumbnails/project_1_file123_thumb.jpg',
        watermarkedPath: 'watermarked/project_1_file123_wm.jpg',
      });
    });
  });

  describe('getImageDimensions', () => {
    it('deve obter dimensões da imagem', async () => {
      const mockImageBuffer = Buffer.from('fake image');
      const mockMetadata = { width: 1920, height: 1080 };

      (sharp as any).mockReturnValue({
        metadata: vi.fn().mockResolvedValue(mockMetadata),
      });

      const result = await service.getImageDimensions(mockImageBuffer);

      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    it('deve retornar dimensões padrão quando metadata não tem width/height', async () => {
      const mockImageBuffer = Buffer.from('fake image');
      const mockMetadata = {};

      (sharp as any).mockReturnValue({
        metadata: vi.fn().mockResolvedValue(mockMetadata),
      });

      const result = await service.getImageDimensions(mockImageBuffer);

      expect(result).toEqual({ width: 0, height: 0 });
    });

    it('deve lançar erro quando falha ao obter dimensões', async () => {
      const mockImageBuffer = Buffer.from('fake image');
      const mockError = new Error('Metadata error');

      (sharp as any).mockImplementation(() => {
        throw mockError;
      });

      await expect(service.getImageDimensions(mockImageBuffer)).rejects.toThrow(
        'Erro ao obter dimensões da imagem: Metadata error'
      );
    });
  });
});