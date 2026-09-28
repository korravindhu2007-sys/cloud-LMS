import express from 'express';
import { requireAuth, requireStudent } from '../middleware/auth.js';
import {
	getQuizAttemptsController,
	getQuizDetailController,
	submitQuizAttemptController,
} from '../controllers/quizController.js';

const router = express.Router();

router.get('/:id', requireAuth, getQuizDetailController);
router.get('/:id/attempts', requireAuth, getQuizAttemptsController);
router.post('/:id/attempts', requireAuth, requireStudent, submitQuizAttemptController);

export default router;
