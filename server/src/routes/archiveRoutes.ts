import { Router } from 'express';
import * as archiveController from '../controllers/archiveController';

const router = Router();
router.get('/archive', archiveController.getArchiveLogs);
router.post('/archive', archiveController.createArchiveLog);

export default router;
