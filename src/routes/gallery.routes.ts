import { Router } from 'express';
import { galleryController } from '../controllers/gallery.controller.js';

const router = Router();

// Rota pública para visualizar galeria
router.get('/:token', (req, res, next) => galleryController.getGallery(req, res, next));

export default router;
