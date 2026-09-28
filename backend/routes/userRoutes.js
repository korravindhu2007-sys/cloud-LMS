import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getCurrentUser, updateCurrentUser, listAllUsers, listStudents, listFaculty } from '../controllers/userController.js';

const router = express.Router();

router.get('/me', requireAuth, getCurrentUser);
router.put('/me', requireAuth, updateCurrentUser);
router.get('/admin/users', requireAuth, requireAdmin, listAllUsers);
router.get('/admin/students', requireAuth, requireAdmin, listStudents);
router.get('/admin/faculty', requireAuth, requireAdmin, listFaculty);

export default router;
