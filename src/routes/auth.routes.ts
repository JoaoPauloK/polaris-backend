import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Rotas públicas
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));
router.post('/logout', authenticateToken, (req, res, next) => authController.logout(req, res, next));

// Rotas protegidas
router.get('/profile', authenticateToken, (req, res, next) => 
  authController.getProfile(req, res, next)
);
router.patch('/profile', authenticateToken, (req, res, next) => 
  authController.updateProfile(req, res, next)
);

export default router;
