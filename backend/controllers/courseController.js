import { validateCourseInput } from '../validation/validators.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  createCourseService,
  listCourses,
  fetchCourseById,
  updateCourseService,
  deleteCourseService,
  enrollStudentService,
  getStudentCourses,
} from '../services/courseService.js';
import {
  getModulesByCourse,
  createModule,
  updateModule,
  deleteModule,
  getModuleById,
  createLesson,
  getLessonsByModule,
  getLessonById,
  updateLesson,
  deleteLesson,
  getCourseMaterials,
  getMaterialById,
  createMaterial,
  getCourseProgress,
  markLessonCompleted,
} from '../models/courseContentModel.js';
import { isUserEnrolledInCourse } from '../models/courseModel.js';
import { getDatabase } from '../config/db.js';
import { removeCourseUpload, resolveCourseUpload, storeCourseUpload } from '../services/courseUploadService.js';

const db = getDatabase();

function isCourseOwner(user, course) {
  return user.role === 'admin' || (
    user.role === 'faculty' && Number(course.faculty_id) === Number(user.id)
  );
}

function canAccessCourseContent(user, course) {
  return isCourseOwner(user, course) || (
    user.role === 'student' && isUserEnrolledInCourse(user.id, course.id)
  );
}

export function getCourses(req, res) {
  return res.json({ success: true, courses: listCourses() });
}

export function getCourseByIdController(req, res) {
  const course = fetchCourseById(req.params.id);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found.' });
  }

  const enrollmentState = req.user.role === 'student' && isUserEnrolledInCourse(req.user.id, course.id);

  if (req.user.role === 'faculty' && !isCourseOwner(req.user, course)) {
    return res.status(403).json({ success: false, message: 'You do not have access to this course.' });
  }

  const hasContentAccess = canAccessCourseContent(req.user, course);

  return res.json({
    success: true,
    course: {
      ...course,
      materials: hasContentAccess ? getCourseMaterials(course.id) : [],
      modules: hasContentAccess ? getModulesByCourse(course.id) : [],
      isEnrolled: enrollmentState,
      hasContentAccess,
    },
  });
}

export function createCourse(req, res, next) {
  try {
    validateCourseInput(req.body);

    if (req.user.role !== 'admin' && req.body.facultyId) {
      return res.status(403).json({ success: false, message: 'Only admins can assign course ownership.' });
    }

    const targetFacultyId = req.user.role === 'admin' && req.body.facultyId ? Number(req.body.facultyId) : req.user.id;
    const course = createCourseService({ ...req.body, facultyId: targetFacultyId }, req.user.id);
    return res.status(201).json({ success: true, course });
  } catch (error) {
    return next(error);
  }
}

export function updateCourseController(req, res, next) {
  try {
    const course = fetchCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only update your own courses.' });
    }

    const updatedCourse = updateCourseService(req.params.id, req.body);
    return res.json({ success: true, course: updatedCourse });
  } catch (error) {
    return next(error);
  }
}

export function deleteCourseController(req, res, next) {
  try {
    const course = fetchCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own courses.' });
    }

    deleteCourseService(req.params.id);
    return res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (error) {
    return next(error);
  }
}

export function enrollInCourse(req, res, next) {
  try {
    const result = enrollStudentService(req.user.id, req.params.id);
    if (result.alreadyEnrolled) {
      return res.status(200).json({ success: true, message: 'You are already enrolled in this course.' });
    }
    return res.status(201).json({ success: true, message: 'Enrollment successful.' });
  } catch (error) {
    return next(error);
  }
}

export function getMyCourses(req, res) {
  const courses = getStudentCourses(req.user.id);
  const enriched = courses.map((course) => ({
    ...course,
    progress: getCourseProgress(req.user.id, course.id).percent,
  }));

  return res.json({ success: true, courses: enriched });
}

export function getCourseMaterialsController(req, res) {
  const course = fetchCourseById(req.params.id);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found.' });
  }

  if (!canAccessCourseContent(req.user, course)) {
    return res.status(403).json({ success: false, message: 'You do not have access to this course material.' });
  }

  return res.json({ success: true, materials: getCourseMaterials(course.id) });
}

export async function createCourseMaterialController(req, res, next) {
  let storageKey = '';
  try {
    const course = fetchCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not own this course.' });
    }

    const title = String(req.body.title || '').trim();
    if (!title) {
      return res.status(400).json({ success: false, message: 'Material title is required.' });
    }
    const externalFileUrl = req.body.fileUrl || req.body.file_url || '';
    if (req.file && externalFileUrl) {
      return res.status(400).json({ success: false, message: 'Choose either an uploaded file or an external resource URL.' });
    }

    if (req.file) {
      storageKey = await storeCourseUpload(course.id, req.file);
    }

    const payload = {
      title,
      fileUrl: storageKey || externalFileUrl,
      fileType: req.file ? path.extname(req.file.originalname).slice(1) : (req.body.fileType || req.body.file_type || 'document'),
    };

    const material = createMaterial(course.id, payload);
    return res.status(201).json({ success: true, material });
  } catch (error) {
    if (storageKey) await removeCourseUpload(storageKey).catch(() => {});
    return next(error);
  }
}

export function getCourseMaterialFileController(req, res, next) {
  try {
    const material = getMaterialById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    const course = fetchCourseById(material.course_id);
    if (!course || !canAccessCourseContent(req.user, course)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this course material.' });
    }

    const filePath = resolveCourseUpload(material.file_url);
    if (!filePath || !existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'This material is an external resource.' });
    }

    const extension = path.extname(filePath);
    const baseName = String(material.title || 'course-material').replace(/[^a-z0-9._-]+/gi, '_');
    return res.download(filePath, `${baseName}${extension}`, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    return next(error);
  }
}

export function getCourseStudentsController(req, res) {
  const course = fetchCourseById(req.params.id);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found.' });
  }

  if (!isCourseOwner(req.user, course)) {
    return res.status(403).json({ success: false, message: 'You do not have access to this course roster.' });
  }

  const students = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.username,
           r.name AS role_name,
           e.enrolled_at,
           e.status
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE e.course_id = ? AND r.name = 'student'
    ORDER BY u.last_name ASC, u.first_name ASC
  `).all(course.id);

  const enriched = students.map((student) => ({
    ...student,
    progress: getCourseProgress(student.id, course.id).percent,
    courseTitle: course.title,
  }));

  return res.json({ success: true, students: enriched, course: { id: course.id, title: course.title }, total: enriched.length });
}

export function getAnnouncementsForUser(req, res) {
  const userId = req.user.id;
  const role = req.user.role;

  let rows = [];

  if (role === 'student') {
    rows = db.prepare(`
      SELECT a.id, a.title, a.content, a.created_at, c.id AS course_id, c.title AS course_title
      FROM announcements a
      LEFT JOIN courses c ON c.id = a.course_id
      JOIN enrollments e ON e.course_id = a.course_id
      WHERE e.user_id = ?
      ORDER BY a.created_at DESC
    `).all(userId);
  } else if (role === 'faculty') {
    rows = db.prepare(`
      SELECT a.id, a.title, a.content, a.created_at, c.id AS course_id, c.title AS course_title
      FROM announcements a
      LEFT JOIN courses c ON c.id = a.course_id
      WHERE c.faculty_id = ?
      ORDER BY a.created_at DESC
    `).all(userId);
  } else if (role === 'admin') {
    rows = db.prepare(`
      SELECT a.id, a.title, a.content, a.created_at, c.id AS course_id, c.title AS course_title
      FROM announcements a
      LEFT JOIN courses c ON c.id = a.course_id
      ORDER BY a.created_at DESC
    `).all();
  }

  return res.json({ success: true, announcements: rows, total: rows.length });
}

export function createAnnouncementController(req, res, next) {
  try {
    const course = fetchCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not own this course.' });
    }

    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const stmt = db.prepare('INSERT INTO announcements (course_id, user_id, title, content) VALUES (?, ?, ?, ?)');
    const result = stmt.run(course.id, req.user.id, title, content);
    const announcement = db.prepare('SELECT id, course_id, title, content, created_at FROM announcements WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({ success: true, announcement });
  } catch (error) {
    return next(error);
  }
}

export function getCourseModules(req, res) {
  const course = fetchCourseById(req.params.id);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found.' });
  }

  if (!canAccessCourseContent(req.user, course)) {
    return res.status(403).json({ success: false, message: 'You must be enrolled in this course to access its content.' });
  }

  return res.json({ success: true, modules: getModulesByCourse(req.params.id) });
}

export function createCourseModule(req, res, next) {
  try {
    const course = fetchCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not own this course.' });
    }

    if (!req.body.title || !String(req.body.title).trim()) {
      return res.status(400).json({ success: false, message: 'Module title is required.' });
    }

    const module = createModule(req.params.id, req.body);
    return res.status(201).json({ success: true, module });
  } catch (error) {
    return next(error);
  }
}

export function updateCourseModule(req, res, next) {
  try {
    const module = getModuleById(req.params.id);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    const course = fetchCourseById(module.course_id);
    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not own this course.' });
    }

    const updated = updateModule(req.params.id, req.body);
    return res.json({ success: true, module: updated });
  } catch (error) {
    return next(error);
  }
}

export function deleteCourseModule(req, res, next) {
  try {
    const module = getModuleById(req.params.id);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    const course = fetchCourseById(module.course_id);
    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not own this course.' });
    }

    deleteModule(req.params.id);
    return res.json({ success: true, message: 'Module deleted successfully.' });
  } catch (error) {
    return next(error);
  }
}

export function createLessonInModule(req, res, next) {
  try {
    const module = getModuleById(req.params.moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    const course = fetchCourseById(module.course_id);
    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not own this course.' });
    }

    if (!req.body.title || !String(req.body.title).trim()) {
      return res.status(400).json({ success: false, message: 'Lesson title is required.' });
    }

    const lesson = createLesson(req.params.moduleId, req.body);
    return res.status(201).json({ success: true, lesson });
  } catch (error) {
    return next(error);
  }
}

export function getModuleLessons(req, res) {
  const module = getModuleById(req.params.moduleId);
  if (!module) {
    return res.status(404).json({ success: false, message: 'Module not found.' });
  }

  const course = fetchCourseById(module.course_id);
  if (!canAccessCourseContent(req.user, course)) {
    return res.status(403).json({ success: false, message: 'You do not have access to this module.' });
  }

  return res.json({ success: true, lessons: getLessonsByModule(req.params.moduleId) });
}

export function getLessonDetail(req, res) {
  const lesson = getLessonById(req.params.id);
  if (!lesson) {
    return res.status(404).json({ success: false, message: 'Lesson not found.' });
  }

  const course = fetchCourseById(lesson.course_id);
  if (!canAccessCourseContent(req.user, course)) {
    return res.status(403).json({ success: false, message: 'You do not have access to this lesson.' });
  }

  return res.json({ success: true, lesson });
}

export function updateLessonController(req, res, next) {
  try {
    const lesson = getLessonById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    const module = getModuleById(lesson.module_id);
    const course = fetchCourseById(module.course_id);
    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not own this course.' });
    }

    const updated = updateLesson(req.params.id, req.body);
    return res.json({ success: true, lesson: updated });
  } catch (error) {
    return next(error);
  }
}

export function deleteLessonController(req, res, next) {
  try {
    const lesson = getLessonById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    const module = getModuleById(lesson.module_id);
    const course = fetchCourseById(module.course_id);
    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not own this course.' });
    }

    deleteLesson(req.params.id);
    return res.json({ success: true, message: 'Lesson deleted successfully.' });
  } catch (error) {
    return next(error);
  }
}

export function completeLesson(req, res, next) {
  try {
    const lesson = getLessonById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    if (req.user.role !== 'student' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only students can complete lessons.' });
    }

    if (!isUserEnrolledInCourse(req.user.id, lesson.course_id)) {
      return res.status(403).json({ success: false, message: 'You must enroll in the course before completing lessons.' });
    }

    const result = markLessonCompleted(req.user.id, req.params.id);
    if (result.alreadyCompleted) {
      return res.status(200).json({ success: true, message: 'Lesson already marked as complete.' });
    }

    const progress = getCourseProgress(req.user.id, lesson.course_id);
    return res.json({ success: true, message: 'Lesson completed successfully.', progress: progress.percent, details: progress });
  } catch (error) {
    return next(error);
  }
}

export function getCourseProgressController(req, res) {
  const course = fetchCourseById(req.params.id);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found.' });
  }

  if (!canAccessCourseContent(req.user, course)) {
    return res.status(403).json({ success: false, message: 'You do not have access to this course progress.' });
  }

  const progress = getCourseProgress(req.user.id, course.id);
  return res.json({ success: true, progress: progress.percent, details: progress });
}
