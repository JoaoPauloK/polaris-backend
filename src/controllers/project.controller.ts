import type { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service.js';
import { z } from 'zod';
import type { CreateProjectData } from '../services/project.service.js';

// Schemas de validação
const createProjectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  driveFolderUrl: z.string().url('Invalid Drive folder URL'),
  packagePhotosCount: z.number().int().positive().optional(),
  additionalPhotoPrice: z.number().positive().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  packagePhotosCount: z.number().int().positive().optional(),
  additionalPhotoPrice: z.number().positive().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

export class ProjectController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const validatedData = createProjectSchema.parse(req.body) as CreateProjectData;

      const project = await projectService.createProject(userId, validatedData);

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: { project },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const { status } = req.query;

      const projects = await projectService.getProjects(
        userId,
        status as string | undefined
      );

      res.json({
        success: true,
        data: { projects },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const projectId = parseInt(req.params.id);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
        });
      }

      const project = await projectService.getProject(projectId, userId);

      res.json({
        success: true,
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const projectId = parseInt(req.params.id);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
        });
      }

      const validatedData = updateProjectSchema.parse(req.body);
      const project = await projectService.updateProject(projectId, userId, validatedData);

      res.json({
        success: true,
        message: 'Project updated successfully',
        data: { project },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const projectId = parseInt(req.params.id);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
        });
      }

      await projectService.deleteProject(projectId, userId);

      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const dashboard = await projectService.getDashboardStats(userId);

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPhotos(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const projectId = parseInt(req.params.id);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
        });
      }

      const photos = await projectService.getProjectPhotos(projectId, userId);

      res.json({
        success: true,
        data: { photos },
      });
    } catch (error) {
      next(error);
    }
  }

  async reopenGallery(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const projectId = parseInt(req.params.id);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
        });
      }

      const project = await projectService.reopenGallery(projectId, userId);

      res.json({
        success: true,
        message: 'Gallery reopened successfully',
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }

  async finalizeProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const projectId = parseInt(req.params.id);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
        });
      }

      const project = await projectService.finalizeProject(projectId, userId);

      res.json({
        success: true,
        message: 'Project finalized successfully',
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
