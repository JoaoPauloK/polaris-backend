import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Todas as rotas de projetos requerem autenticação
router.use(authenticateToken);

router.post('/', (req, res, next) => projectController.create(req, res, next));
router.get('/', (req, res, next) => projectController.getAll(req, res, next));
router.get('/dashboard', (req, res, next) => projectController.getDashboard(req, res, next));
router.get('/:id', (req, res, next) => projectController.getOne(req, res, next));
router.get('/:id/photos', (req, res, next) => projectController.getPhotos(req, res, next));
router.post('/:id/reopen-gallery', (req, res, next) => projectController.reopenGallery(req, res, next));
router.post('/:id/finalize', (req, res, next) => projectController.finalizeProject(req, res, next));
router.patch('/:id', (req, res, next) => projectController.update(req, res, next));
router.delete('/:id', (req, res, next) => projectController.delete(req, res, next));

export default router;
