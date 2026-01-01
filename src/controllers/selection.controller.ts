import type { Request, Response, NextFunction } from 'express';
import { selectionService } from '../services/selection.service.js';
import { z } from 'zod';

// Schemas de validação
const createSelectionSchema = z.object({
  projectToken: z.string().uuid('Invalid project token'),
  clientName: z.string().min(2, 'Client name must be at least 2 characters'),
  clientEmail: z.string().email('Invalid email address'),
  clientPhone: z.string().optional(),
  photoIds: z.array(z.number().int().positive()).min(1, 'At least one photo must be selected'),
  notes: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'delivered', 'cancelled']),
});

export class SelectionController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createSelectionSchema.parse(req.body);
      const selection = await selectionService.createSelection(validatedData);

      res.status(201).json({
        success: true,
        message: 'Selection created successfully',
        data: { selection },
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

  async getByProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const projectId = parseInt(req.params.projectId);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
        });
      }

      const selections = await selectionService.getSelectionsByProject(projectId, userId);

      res.json({
        success: true,
        data: { selections },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const selectionId = parseInt(req.params.id);

      if (isNaN(selectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid selection ID',
        });
      }

      const selection = await selectionService.getSelection(selectionId);

      res.json({
        success: true,
        data: { selection },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const selectionId = parseInt(req.params.id);

      if (isNaN(selectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid selection ID',
        });
      }

      const validatedData = updateStatusSchema.parse(req.body);
      const selection = await selectionService.updateSelectionStatus(
        selectionId,
        userId,
        validatedData.status
      );

      res.json({
        success: true,
        message: 'Selection status updated successfully',
        data: { selection },
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
      const selectionId = parseInt(req.params.id);

      if (isNaN(selectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid selection ID',
        });
      }

      await selectionService.deleteSelection(selectionId, userId);

      res.json({
        success: true,
        message: 'Selection deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadZip(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const selectionId = parseInt(req.params.id);

      if (isNaN(selectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid selection ID',
        });
      }

      await selectionService.downloadSelectionAsZip(selectionId, userId, res);
    } catch (error) {
      next(error);
    }
  }




}

export const selectionController = new SelectionController();
