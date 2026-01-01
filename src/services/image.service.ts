import sharp from 'sharp';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

export interface WatermarkOptions {
  width?: number;
  quality?: number;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkSize?: number;
}

export class ImageProcessingService {
  private readonly UPLOAD_DIR = process.env.UPLOAD_PATH || './uploads';
  private readonly WATERMARK_TEXT = process.env.WATERMARK_TEXT || 'POLARIS • PREVIEW';
  private readonly WATERMARK_OPACITY = parseFloat(process.env.WATERMARK_OPACITY || '0.3');

  constructor() {
    this.ensureUploadDirectories();
  }

  /**
   * Garante que os diretórios de upload existem
   */
  private async ensureUploadDirectories() {
    try {
      await fs.mkdir(path.join(this.UPLOAD_DIR, 'thumbnails'), { recursive: true });
      await fs.mkdir(path.join(this.UPLOAD_DIR, 'watermarked'), { recursive: true });
    } catch (error) {
      console.error('Erro ao criar diretórios de upload:', error);
    }
  }

  /**
   * Baixa uma imagem de uma URL
   */
  async downloadImageFromUrl(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Polaris/1.0)',
        },
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      throw new Error(`Erro ao baixar imagem: ${error.message}`);
    }
  }

  /**
   * Gera thumbnail simples
   */
  async generateThumbnail(imageBuffer: Buffer, width: number = 400): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .resize(width, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
    } catch (error: any) {
      throw new Error(`Erro ao gerar thumbnail: ${error.message}`);
    }
  }

  /**
   * Gera imagem com marca d'água
   */
  async generateWatermarkedImage(
    imageBuffer: Buffer,
    options: WatermarkOptions = {}
  ): Promise<Buffer> {
    const {
      width = 800,
      quality = 70,
      watermarkText = this.WATERMARK_TEXT,
      watermarkOpacity = this.WATERMARK_OPACITY,
      watermarkSize = 48,
    } = options;

    try {
      // Obtém dimensões da imagem
      const metadata = await sharp(imageBuffer).metadata();
      const imageWidth = metadata.width || width;
      const imageHeight = metadata.height || Math.floor((imageWidth * 3) / 4);

      // Redimensiona a imagem
      const resizedImage = await sharp(imageBuffer)
        .resize(width, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();

      // Obtém as dimensões reais após redimensionar
      const resizedMetadata = await sharp(resizedImage).metadata();
      const finalWidth = resizedMetadata.width || width;
      const finalHeight = resizedMetadata.height || Math.floor((width * 3) / 4);

      // Cria SVG com marca d'água diagonal
      const watermarkSvg = Buffer.from(`
        <svg width="${finalWidth}" height="${finalHeight}">
          <defs>
            <pattern id="watermark-pattern" x="0" y="0" width="${finalWidth}" height="${finalHeight}" patternUnits="userSpaceOnUse">
              <g transform="translate(${finalWidth / 2}, ${finalHeight / 2}) rotate(-45)">
                <text
                  x="0"
                  y="0"
                  text-anchor="middle"
                  font-family="Arial, sans-serif"
                  font-size="${watermarkSize}"
                  font-weight="bold"
                  fill="white"
                  opacity="${watermarkOpacity}"
                  stroke="black"
                  stroke-width="1"
                  stroke-opacity="${watermarkOpacity * 0.5}"
                >
                  ${watermarkText}
                </text>
              </g>
            </pattern>
          </defs>
          <rect width="${finalWidth}" height="${finalHeight}" fill="url(#watermark-pattern)" />
        </svg>
      `);

      // Adiciona marca d'água
      const watermarkedImage = await sharp(resizedImage)
        .composite([
          {
            input: watermarkSvg,
            blend: 'over',
          },
        ])
        .jpeg({ quality, progressive: true })
        .toBuffer();

      return watermarkedImage;
    } catch (error: any) {
      console.error('Erro ao processar imagem:', error);
      throw new Error(`Erro ao processar imagem: ${error.message}`);
    }
  }

  /**
   * Salva buffer de imagem em arquivo
   */
  async saveImage(imageBuffer: Buffer, filename: string, subdir: string = ''): Promise<string> {
    try {
      const dir = subdir ? path.join(this.UPLOAD_DIR, subdir) : this.UPLOAD_DIR;
      await fs.mkdir(dir, { recursive: true });

      const filepath = path.join(dir, filename);
      await fs.writeFile(filepath, imageBuffer);

      // Retorna caminho relativo para URL
      return subdir ? path.join(subdir, filename) : filename;
    } catch (error: any) {
      throw new Error(`Erro ao salvar imagem: ${error.message}`);
    }
  }

  /**
   * Processa imagem do Google Drive: baixa, cria thumbnail e versão com marca d'água
   */
  async processGoogleDriveImage(
    imageUrl: string,
    fileId: string,
    projectId: number
  ): Promise<{ thumbnailPath: string; watermarkedPath: string }> {
    try {
      // Baixa imagem original
      const imageBuffer = await this.downloadImageFromUrl(imageUrl);

      // Gera nomes de arquivo
      const thumbnailFilename = `project_${projectId}_${fileId}_thumb.jpg`;
      const watermarkedFilename = `project_${projectId}_${fileId}_wm.jpg`;

      // Gera thumbnail
      const thumbnailBuffer = await this.generateThumbnail(imageBuffer);
      const thumbnailPath = await this.saveImage(thumbnailBuffer, thumbnailFilename, 'thumbnails');

      // Gera versão com marca d'água
      const watermarkedBuffer = await this.generateWatermarkedImage(imageBuffer);
      const watermarkedPath = await this.saveImage(
        watermarkedBuffer,
        watermarkedFilename,
        'watermarked'
      );

      return {
        thumbnailPath,
        watermarkedPath,
      };
    } catch (error: any) {
      console.error(`Erro ao processar imagem ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Obtém dimensões de uma imagem
   */
  async getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error: any) {
      throw new Error(`Erro ao obter dimensões da imagem: ${error.message}`);
    }
  }
}

export const imageProcessingService = new ImageProcessingService();
