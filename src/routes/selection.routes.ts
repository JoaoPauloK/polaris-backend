import { Router } from 'express';
import { selectionController } from '../controllers/selection.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Rota pública para criar seleção
router.post('/', (req, res, next) => selectionController.create(req, res, next));

// Rotas protegidas (apenas para fotógrafos)
router.get('/project/:projectId', authenticateToken, (req, res, next) => 
  selectionController.getByProject(req, res, next)
);
router.get('/:id', authenticateToken, (req, res, next) => 
  selectionController.getOne(req, res, next)
);
router.patch('/:id/status', authenticateToken, (req, res, next) => 
  selectionController.updateStatus(req, res, next)
);

// NOVAS ROTAS PARA DOWNLOADS LEVES
// Removidas - abordagem simplificada implementada no frontend

// Rota tradicional (pode ser mantida para compatibilidade)
router.get('/:id/download', authenticateToken, (req, res, next) => 
  selectionController.downloadZip(req, res, next)
);

router.delete('/:id', authenticateToken, (req, res, next) => 
  selectionController.delete(req, res, next)
);

export default router;
