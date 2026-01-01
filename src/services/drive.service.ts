import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

export interface GoogleDriveImage {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  thumbnailLink?: string | null;
  webContentLink?: string | null;
  webViewLink?: string | null;
}

export interface FolderMetadata {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
}

export class GoogleDriveService {
  private drive: drive_v3.Drive;

  constructor() {
    // Autenticação com API Key (modo público - read-only)
    // Para produção, use OAuth2 ou Service Account
    const auth = new google.auth.GoogleAuth({
      apiKey: process.env.GOOGLE_API_KEY,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    this.drive = google.drive({ version: 'v3', auth: auth as any });
  }

  /**
   * Extrai o ID da pasta do Google Drive a partir de uma URL
   */
  extractFolderId(driveUrl: string): string | null {
    // Formatos suportados:
    // https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j
    // https://drive.google.com/drive/u/0/folders/1a2b3c4d5e6f7g8h9i0j
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /^([a-zA-Z0-9_-]+)$/,
    ];

    for (const pattern of patterns) {
      const match = driveUrl.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Lista todas as imagens de uma pasta do Google Drive (pública)
   */
  async listImagesFromFolder(folderId: string): Promise<GoogleDriveImage[]> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'image/') and trashed = false`,
        fields:
          'files(id, name, mimeType, size, createdTime, thumbnailLink, webContentLink, webViewLink)',
        orderBy: 'name',
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = response.data.files || [];

      return files.map((file, index) => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: parseInt(file.size || '0'),
        createdTime: file.createdTime || new Date().toISOString(),
        thumbnailLink: file.thumbnailLink,
        webContentLink: file.webContentLink,
        webViewLink: file.webViewLink,
      }));
    } catch (error: any) {
      console.error('Erro ao listar imagens do Google Drive:', error);
      
      if (error.code === 404) {
        throw new Error(
          'Pasta não encontrada. Certifique-se de que a pasta existe e está com compartilhamento público ativado.'
        );
      }
      
      if (error.code === 403) {
        throw new Error(
          'Sem permissão para acessar a pasta. A pasta precisa estar com compartilhamento público (qualquer pessoa com o link pode visualizar).'
        );
      }

      throw new Error(`Erro ao acessar Google Drive: ${error.message}`);
    }
  }

  /**
   * Baixa uma imagem do Google Drive usando o webContentLink
   */
  async getImageDownloadUrl(fileId: string): Promise<string> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'webContentLink, webViewLink',
        supportsAllDrives: true,
      });

      // Retorna URL de download direto ou view link
      return (
        response.data.webContentLink ||
        response.data.webViewLink ||
        `https://drive.google.com/uc?id=${fileId}&export=download`
      );
    } catch (error: any) {
      console.error('Erro ao obter URL de download:', error);
      // Fallback para URL pública
      return `https://drive.google.com/uc?id=${fileId}&export=download`;
    }
  }

  /**
   * Obtém o thumbnail do Google Drive (já processado pelo Drive)
   * Para galeria pública, retorna tamanho menor com marca d'água visual
   */
  getThumbnailUrl(fileId: string, size: number = 800): string {
    // Google Drive gera thumbnails automaticamente
    // Tamanho reduzido para economizar banda e adicionar "proteção"
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
  }

  /**
   * Obtém URL de thumbnail com marca d'água para clientes
   * Usa tamanho menor para evitar downloads de alta qualidade
   */
  getWatermarkedThumbnailUrl(fileId: string): string {
    // Thumbnail de 400px - boa qualidade para preview, mas não para impressão
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  }

  /**
   * Obtém URL de imagem média para lightbox de clientes
   * Tamanho maior para visualização, mas ainda com limitação de resolução
   */
  getWatermarkedLightboxUrl(fileId: string): string {
    // Imagem de 1200px - boa para visualizar detalhes, mas não em alta resolução
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
  }

  /**
   * Obtém URL de download direto do arquivo original
   * Para fotos selecionadas após fechamento da galeria
   */
  getDirectDownloadUrl(fileId: string): string {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  /**
   * Verifica se o usuário tem acesso à pasta
   */
  async checkFolderAccess(folderId: string): Promise<boolean> {
    try {
      await this.drive.files.get({
        fileId: folderId,
        fields: 'id, name',
        supportsAllDrives: true,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtém metadados da pasta
   */
  async getFolderMetadata(folderId: string): Promise<FolderMetadata> {
    try {
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'id, name, createdTime, modifiedTime',
        supportsAllDrives: true,
      });

      return {
        id: response.data.id!,
        name: response.data.name!,
        createdTime: response.data.createdTime || new Date().toISOString(),
        modifiedTime: response.data.modifiedTime || new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Erro ao obter metadados da pasta: ${error.message}`);
    }
  }

  /**
   * Gera URL pública para visualização de imagem
   */
  getPublicImageUrl(fileId: string): string {
    return `https://drive.google.com/uc?id=${fileId}&export=view`;
  }

  /**
   * Baixa o arquivo do Google Drive como buffer
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        maxRedirects: 5,
      });
      return Buffer.from(response.data);
    } catch (error: any) {
      throw new Error(`Erro ao baixar arquivo do Drive: ${error.message}`);
    }
  }
}

export const googleDriveService = new GoogleDriveService();
