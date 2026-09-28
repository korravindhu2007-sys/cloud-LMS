import { getDatabase } from '../config/db.js';

const db = getDatabase();

export function createModule(courseId, { title, description }) {
  const result = db.prepare(`
    INSERT INTO modules (course_id, title, description)
    VALUES (?, ?, ?)
  `).run(courseId, title, description || '');

  return db.prepare('SELECT * FROM modules WHERE id = ?').get(result.lastInsertRowid);
}

export function getModuleById(moduleId) {
  return db.prepare(`
    SELECT m.*, c.id AS course_id, c.title AS course_title
    FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE m.id = ?
  `).get(moduleId);
}

export function updateModule(moduleId, fields) {
  const updates = Object.entries(fields)
    .filter(([key, value]) => ['title', 'description'].includes(key) && value !== undefined);
  if (!updates.length) {
    return getModuleById(moduleId);
  }

  const assignments = updates.map(([key]) => `${key} = ?`).join(', ');
  const values = updates.map(([, value]) => value);
  db.prepare(`UPDATE modules SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, moduleId);
  return getModuleById(moduleId);
}

export function deleteModule(moduleId) {
  return db.prepare('DELETE FROM modules WHERE id = ?').run(moduleId).changes > 0;
}

export function getModulesByCourse(courseId) {
  const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY id ASC').all(courseId);
  return modules.map((module) => ({
    ...module,
    lessons: getLessonsByModule(module.id),
  }));
}

export function createLesson(moduleId, { title, content, lessonOrder, lesson_order }) {
  const result = db.prepare(`
    INSERT INTO lessons (module_id, title, content, lesson_order)
    VALUES (?, ?, ?, ?)
  `).run(moduleId, title, content || '', Number(lessonOrder ?? lesson_order ?? 1));

  return getLessonById(result.lastInsertRowid);
}

export function updateLesson(lessonId, fields) {
  const normalizedFields = {
    title: fields.title,
    content: fields.content,
    lesson_order: fields.lessonOrder ?? fields.lesson_order,
  };
  const updates = Object.entries(normalizedFields)
    .filter(([key, value]) => ['title', 'content', 'lesson_order'].includes(key) && value !== undefined);
  if (!updates.length) {
    return getLessonById(lessonId);
  }

  const assignments = updates.map(([key]) => `${key} = ?`).join(', ');
  const values = updates.map(([, value]) => value);
  db.prepare(`UPDATE lessons SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, lessonId);
  return getLessonById(lessonId);
}

export function deleteLesson(lessonId) {
  return db.prepare('DELETE FROM lessons WHERE id = ?').run(lessonId).changes > 0;
}

export function getLessonById(lessonId) {
  return db.prepare(`
    SELECT l.*, m.course_id, c.title AS course_title
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    WHERE l.id = ?
  `).get(lessonId);
}

export function getLessonsByModule(moduleId) {
  return db.prepare('SELECT * FROM lessons WHERE module_id = ? ORDER BY lesson_order ASC, id ASC').all(moduleId);
}

export function getCourseMaterials(courseId) {
  return db.prepare('SELECT * FROM materials WHERE course_id = ? ORDER BY created_at DESC').all(courseId);
}

export function getMaterialById(materialId) {
  return db.prepare('SELECT * FROM materials WHERE id = ?').get(materialId);
}

export function createMaterial(courseId, payload) {
  const result = db.prepare(`
    INSERT INTO materials (course_id, title, file_url, file_type)
    VALUES (?, ?, ?, ?)
  `).run(courseId, payload.title, payload.fileUrl || payload.file_url || '', payload.fileType || payload.file_type || 'resource');
  return db.prepare('SELECT * FROM materials WHERE id = ?').get(result.lastInsertRowid);
}

export function isLessonCompleted(userId, lessonId) {
  return !!db.prepare('SELECT 1 FROM lesson_completions WHERE user_id = ? AND lesson_id = ?').get(userId, lessonId);
}

export function markLessonCompleted(userId, lessonId) {
  const existing = isLessonCompleted(userId, lessonId);
  if (existing) {
    return { alreadyCompleted: true };
  }

  db.prepare('INSERT INTO lesson_completions (lesson_id, user_id) VALUES (?, ?)').run(lessonId, userId);
  return { alreadyCompleted: false };
}

export function getCourseProgress(userId, courseId) {
  const total = db.prepare(`
    SELECT COUNT(*) AS total_lessons
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE m.course_id = ?
  `).get(courseId)?.total_lessons || 0;

  const completed = db.prepare(`
    SELECT COUNT(*) AS completed_lessons
    FROM lesson_completions lc
    JOIN lessons l ON l.id = lc.lesson_id
    JOIN modules m ON m.id = l.module_id
    WHERE lc.user_id = ? AND m.course_id = ?
  `).get(userId, courseId)?.completed_lessons || 0;

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    courseId,
    totalLessons: total,
    completedLessons: completed,
    percent,
  };
}
