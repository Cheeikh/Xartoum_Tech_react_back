// creditRoutes.js
import express from 'express';
import { purchaseCredits, getUserCredits } from '../controllers/creditController.js';

const router = express.Router();

router.post('', purchaseCredits);
router.get('/:userId', getUserCredits);

export default router;
