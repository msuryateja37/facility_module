import { Router } from 'express';
import * as vaultController from '../controllers/vaultController';

const router = Router();

router.get('/vault/folders', vaultController.getFolders);
router.post('/vault/folders', vaultController.createFolder);
router.get('/vault/folders/:province/:incidentNumber/files', vaultController.getFiles);
router.post('/vault/folders/:province/:incidentNumber/files', vaultController.uploadFile);
router.delete('/vault/folders/:province/:incidentNumber/files/:fileName', vaultController.deleteFile);

export default router;
