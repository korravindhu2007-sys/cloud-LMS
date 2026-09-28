import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requireAuth, requireAdmin, requireFaculty, requireStudent } from './middleware/auth.js';
import {
  updateCourseModule,
  deleteCourseModule,
  createLessonInModule,
  getModuleLessons,
  getLessonDetail,
  updateLessonController,
  deleteLessonController,
  completeLesson,
  getMyCourses,
  getAnnouncementsForUser,
  getCourseMaterialFileController,
} from './controllers/courseController.js';
import { listAllUsers, listStudents, listFaculty } from './controllers/userController.js';

initializeDatabase();

const app = express();
const port = Number(process.env.PORT || 5000);
const allowedOrigins = new Set([
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  process.env.CLIENT_URL,
].filter(Boolean));

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, origin || true);
      return;
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'LMS backend is running.' });
});

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/courses', courseRoutes);
app.get('/materials/:id/file', requireAuth, getCourseMaterialFileController);
app.use('/quizzes', quizRoutes);
app.use(assignmentRoutes);
app.get('/me/courses', requireAuth, requireStudent, getMyCourses);
app.get('/announcements/my', requireAuth, getAnnouncementsForUser);
app.get('/admin/users', requireAuth, requireAdmin, listAllUsers);
app.get('/admin/students', requireAuth, requireAdmin, listStudents);
app.get('/admin/faculty', requireAuth, requireAdmin, listFaculty);
app.put('/modules/:id', requireAuth, requireFaculty, updateCourseModule);
app.delete('/modules/:id', requireAuth, requireFaculty, deleteCourseModule);
app.post('/modules/:moduleId/lessons', requireAuth, requireFaculty, createLessonInModule);
app.get('/modules/:moduleId/lessons', requireAuth, getModuleLessons);
app.get('/lessons/:id', requireAuth, getLessonDetail);
app.put('/lessons/:id', requireAuth, requireFaculty, updateLessonController);
app.delete('/lessons/:id', requireAuth, requireFaculty, deleteLessonController);
app.post('/lessons/:id/complete', requireAuth, requireStudent, completeLesson);

app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`LMS backend listening on http://localhost:${port}`);
  });
}

export default app;
