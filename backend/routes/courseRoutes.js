import express from 'express';
import { requireAuth, requireStudent, requireFaculty } from '../middleware/auth.js';
import {
  getCourses,
  getCourseByIdController,
  createCourse,
  updateCourseController,
  deleteCourseController,
  enrollInCourse,
  getMyCourses,
  getCourseModules,
  createCourseModule,
  getCourseMaterialsController,
  createCourseMaterialController,
  getCourseStudentsController,
  getCourseProgressController,
  createAnnouncementController,
} from '../controllers/courseController.js';
import { createQuizController, listQuizzesForCourseController } from '../controllers/quizController.js';
import { uploadCourseMaterial } from '../middleware/courseUpload.js';

const router = express.Router();

router.get('/', getCourses);
router.get('/me/courses', requireAuth, requireStudent, getMyCourses);
router.post('/', requireAuth, requireFaculty, createCourse);
router.post('/:id/enroll', requireAuth, requireStudent, enrollInCourse);
router.get('/:id/progress', requireAuth, getCourseProgressController);
router.get('/:id/modules', requireAuth, getCourseModules);
router.post('/:id/modules', requireAuth, requireFaculty, createCourseModule);
router.get('/:id/materials', requireAuth, getCourseMaterialsController);
router.post('/:id/materials', requireAuth, requireFaculty, uploadCourseMaterial, createCourseMaterialController);
router.get('/:id/quizzes', requireAuth, listQuizzesForCourseController);
router.post('/:id/quizzes', requireAuth, requireFaculty, createQuizController);
router.post('/:id/announcements', requireAuth, requireFaculty, createAnnouncementController);
router.get('/:id/students', requireAuth, getCourseStudentsController);
router.get('/:id', requireAuth, getCourseByIdController);
router.put('/:id', requireAuth, requireFaculty, updateCourseController);
router.delete('/:id', requireAuth, requireFaculty, deleteCourseController);

export default router;
