import { Router } from 'express';
import * as aiController from '../controllers/aiController';

const router = Router();
router.post('/ai/chat', aiController.chatMessage);

export default router;
