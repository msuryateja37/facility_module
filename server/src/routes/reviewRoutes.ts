import { Router } from 'express';
import * as reviewController from '../controllers/reviewController';

const router = Router();
router.get('/stats', reviewController.getStats);
router.get('/reviews', reviewController.getReviews);
router.get('/reviews/:id', reviewController.getReviewById);
router.post('/reviews', reviewController.createReview);
router.put('/reviews/:id', reviewController.updateReview);
router.post('/reviews/:id/upload', reviewController.uploadFile);
router.post('/reviews/upload-invoice', reviewController.uploadInvoice);

export default router;
