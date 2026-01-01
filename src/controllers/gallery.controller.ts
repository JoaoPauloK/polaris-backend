import type { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service.js';

export class GalleryController {
  async getGallery(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Gallery token is required',
        });
      }

      const gallery = await projectService.getProjectByToken(token);

      res.json({
        success: true,
        data: gallery,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const galleryController = new GalleryController();
