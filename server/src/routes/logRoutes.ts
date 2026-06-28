import { Router } from 'express';
import * as logController from '../controllers/logController';

const router = Router();
router.get('/logs', logController.getSystemLogs);

export default router;
