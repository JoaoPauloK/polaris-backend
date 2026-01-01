import { Router } from 'express';
import { driveController } from '../controllers/drive.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Sincronizar fotos de um projeto
router.post('/sync/:projectId', (req, res, next) => 
  driveController.syncPhotos(req, res, next)
);

// Verificar acesso a uma pasta
router.get('/check/:folderId', (req, res, next) => 
  driveController.checkAccess(req, res, next)
);

// Preview de imagens de uma pasta
router.get('/preview/:folderId', (req, res, next) => 
  driveController.previewFolder(req, res, next)
);

export default router;
