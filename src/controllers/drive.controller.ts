import type { Request, Response, NextFunction } from 'express';
import { googleDriveService } from '../services/drive.service.js';
import { imageProcessingService } from '../services/image.service.js';
import { photoRepository } from '../repositories/photo.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import type { NewPhoto } from '../db/schema.js';

export class DriveController {
  /**
   * Sincroniza fotos de uma pasta do Google Drive para um projeto
   */
  async syncPhotos(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const projectId = parseInt(req.params.projectId);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
        });
      }

      // Verifica se o projeto pertence ao usuário
      const project = await projectRepository.findByIdAndUserId(projectId, userId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      if (!project.driveFolderId) {
        return res.status(400).json({
          success: false,
          message: 'Project does not have a Google Drive folder configured',
        });
      }

      // Lista imagens da pasta do Google Drive
      console.log(`📂 Buscando imagens da pasta: ${project.driveFolderId}`);
      const driveImages = await googleDriveService.listImagesFromFolder(project.driveFolderId);

      if (driveImages.length === 0) {
        return res.json({
          success: true,
          message: 'No images found in the Google Drive folder',
          data: { syncedCount: 0, totalImages: 0 },
        });
      }

      console.log(`📸 Encontradas ${driveImages.length} imagens`);

      // Processa cada imagem
      let syncedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < driveImages.length; i++) {
        const image = driveImages[i];
        
        try {
          console.log(`⚙️  Processando ${i + 1}/${driveImages.length}: ${image.name}`);

          // Verifica se a foto já existe
          const existingPhotos = await photoRepository.findByProjectId(projectId);
          const photoExists = existingPhotos.some((p) => p.driveFileId === image.id);

          if (photoExists) {
            console.log(`⏭️  Foto já existe: ${image.name}`);
            continue;
          }

          // Obtém URLs do Google Drive
          const originalUrl = googleDriveService.getPublicImageUrl(image.id);
          const thumbnailUrl = googleDriveService.getThumbnailUrl(image.id, 400);
          const watermarkedUrl = googleDriveService.getThumbnailUrl(image.id, 800);

          // Opcional: processar e salvar localmente (comentado para usar URLs do Drive)
          // const imageUrl = await googleDriveService.getImageDownloadUrl(image.id);
          // const { thumbnailPath, watermarkedPath } = await imageProcessingService.processGoogleDriveImage(
          //   imageUrl,
          //   image.id,
          //   projectId
          // );

          // Cria registro da foto no banco
          const photoData: NewPhoto = {
            projectId,
            driveFileId: image.id,
            driveFileName: image.name,
            originalUrl,
            thumbnailUrl,
            watermarkedUrl,
            width: null,
            height: null,
            sizeBytes: image.size,
            position: i,
          };

          await photoRepository.create(photoData);
          syncedCount++;
          console.log(`✅ Sincronizada: ${image.name}`);
        } catch (error: any) {
          console.error(`❌ Erro ao processar ${image.name}:`, error.message);
          errors.push(`${image.name}: ${error.message}`);
        }
      }

      res.json({
        success: true,
        message: `Successfully synced ${syncedCount} of ${driveImages.length} images`,
        data: {
          syncedCount,
          totalImages: driveImages.length,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verifica acesso a uma pasta do Google Drive
   */
  async checkAccess(req: Request, res: Response, next: NextFunction) {
    try {
      const { folderId } = req.params;

      if (!folderId) {
        return res.status(400).json({
          success: false,
          message: 'Folder ID is required',
        });
      }

      const hasAccess = await googleDriveService.checkFolderAccess(folderId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Cannot access the folder. Make sure it is publicly shared.',
        });
      }

      // Obtém metadados da pasta
      const metadata = await googleDriveService.getFolderMetadata(folderId);

      res.json({
        success: true,
        message: 'Folder is accessible',
        data: { metadata },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lista imagens de uma pasta sem salvar
   */
  async previewFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const { folderId } = req.params;

      if (!folderId) {
        return res.status(400).json({
          success: false,
          message: 'Folder ID is required',
        });
      }

      const images = await googleDriveService.listImagesFromFolder(folderId);

      res.json({
        success: true,
        data: {
          count: images.length,
          images: images.slice(0, 10), // Retorna apenas as 10 primeiras para preview
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const driveController = new DriveController();
