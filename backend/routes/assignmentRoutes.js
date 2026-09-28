import express from 'express';
import { requireAuth, requireFaculty, requireStudent } from '../middleware/auth.js';
import {
  createAssignmentController,
  deleteAssignmentController,
  evaluateSubmissionController,
  getAssignmentDetailController,
  getAssignmentSubmissionsController,
  getMySubmissionController,
  listAssignmentsForCourseController,
  submitAssignmentController,
} from '../controllers/assignmentController.js';

const router = express.Router();

router.get('/courses/:id/assignments', requireAuth, listAssignmentsForCourseController);
router.post('/courses/:id/assignments', requireAuth, requireFaculty, createAssignmentController);

router.get('/assignments/:id', requireAuth, getAssignmentDetailController);
router.get('/assignments/:id/my-submission', requireAuth, getMySubmissionController);
router.get('/assignments/:id/submissions', requireAuth, getAssignmentSubmissionsController);
router.post('/assignments/:id/submissions', requireAuth, requireStudent, submitAssignmentController);
router.post('/submissions/:id/evaluate', requireAuth, requireFaculty, evaluateSubmissionController);
router.delete('/assignments/:id', requireAuth, requireFaculty, deleteAssignmentController);

export default router;
