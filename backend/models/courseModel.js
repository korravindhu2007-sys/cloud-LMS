import { getDatabase } from '../config/db.js';

const db = getDatabase();

export function createCourse({ title, description, code, credits, status, facultyId }) {
  const result = db.prepare(`
    INSERT INTO courses (title, description, code, credits, status, faculty_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, description || '', code.toUpperCase(), Number(credits || 0), status || 'draft', facultyId);

  return getCourseById(result.lastInsertRowid);
}

export function getCourseById(id) {
  return db.prepare(`
    SELECT c.*, u.first_name, u.last_name, u.email, u.username
    FROM courses c
    LEFT JOIN users u ON u.id = c.faculty_id
    WHERE c.id = ?
  `).get(id);
}

export function getAllCourses() {
  return db.prepare(`
    SELECT c.*, u.first_name, u.last_name, u.username
    FROM courses c
    LEFT JOIN users u ON u.id = c.faculty_id
    ORDER BY c.created_at DESC
  `).all();
}

export function updateCourse(id, updateInfo) {
  const allowedFields = ['title', 'description', 'code', 'credits', 'status'];
  const updates = Object.entries(updateInfo)
    .filter(([key, value]) => allowedFields.includes(key) && value !== undefined)
    .map(([key, value]) => [key, key === 'code' ? String(value).toUpperCase() : value]);

  if (!updates.length) return getCourseById(id);

  const assignments = updates.map(([key]) => `${key} = ?`).join(', ');
  const values = updates.map(([, value]) => value);

  db.prepare(`UPDATE courses SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
  return getCourseById(id);
}

export function deleteCourse(id) {
  const result = db.prepare('DELETE FROM courses WHERE id = ?').run(id);
  return result.changes > 0;
}

export function enrollStudentInCourse(userId, courseId) {
  const existing = db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, courseId);
  if (existing) {
    return { alreadyEnrolled: true, enrollment: existing };
  }

  const result = db.prepare(`
    INSERT INTO enrollments (user_id, course_id, status)
    VALUES (?, ?, 'active')
  `).run(userId, courseId);

  return { alreadyEnrolled: false, enrollmentId: result.lastInsertRowid };
}

export function getUserCourses(userId) {
  return db.prepare(`
    SELECT c.*, e.status, e.enrolled_at
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ?
    ORDER BY e.enrolled_at DESC
  `).all(userId);
}

export function getCourseEnrollmentCount(courseId) {
  return db.prepare('SELECT COUNT(*) AS count FROM enrollments WHERE course_id = ?').get(courseId)?.count || 0;
}

export function isUserEnrolledInCourse(userId, courseId) {
  const row = db.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, courseId);
  return Boolean(row);
}
