import { Router } from 'express';
import * as authController from '../controllers/authController';

const router = Router();
router.post('/auth/login', authController.login);
router.get('/users/:username', authController.getProfile);
router.put('/users/:username', authController.updateProfile);

export default router;
