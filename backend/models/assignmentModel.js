import { getDatabase } from '../config/db.js';

const db = getDatabase();

export function createAssignment(courseId, payload = {}) {
  const title = String(payload.title || '').trim();
  const description = String(payload.description || '').trim();
  const dueDate = payload.dueDate || payload.due_date || null;
  const maxScore = Number(payload.maxScore ?? payload.max_score ?? 100);
  const resourceUrl = String(payload.resourceUrl ?? payload.resource_url ?? '').trim();
  const status = payload.status === 'draft' ? 'draft' : 'published';

  const result = db.prepare(`
    INSERT INTO assignments (course_id, title, description, due_date, max_score, resource_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(courseId, title, description, dueDate, Number.isFinite(maxScore) ? maxScore : 100, resourceUrl, status);

  return getAssignmentById(result.lastInsertRowid);
}

export function getAssignmentById(assignmentId) {
  return db.prepare(`
    SELECT a.*, c.title AS course_title, c.faculty_id, u.username AS faculty_username
    FROM assignments a
    JOIN courses c ON c.id = a.course_id
    LEFT JOIN users u ON u.id = c.faculty_id
    WHERE a.id = ?
  `).get(assignmentId);
}

export function getAssignmentsByCourse(courseId) {
  return db.prepare(`
    SELECT a.*, c.title AS course_title
    FROM assignments a
    JOIN courses c ON c.id = a.course_id
    WHERE a.course_id = ?
    ORDER BY a.due_date IS NULL, a.due_date ASC, a.created_at DESC
  `).all(courseId);
}

export function updateAssignment(assignmentId, fields = {}) {
  const keys = Object.keys(fields);
  if (!keys.length) {
    return getAssignmentById(assignmentId);
  }

  const assignments = keys.map((key) => `${key} = ?`).join(', ');
  const values = keys.map((key) => fields[key]);

  db.prepare(`UPDATE assignments SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, assignmentId);
  return getAssignmentById(assignmentId);
}

export function deleteAssignment(assignmentId) {
  return db.prepare('DELETE FROM assignments WHERE id = ?').run(assignmentId).changes > 0;
}

export function getUserSubmissionForAssignment(assignmentId, userId) {
  return db.prepare(`
    SELECT s.*, u.username, u.first_name, u.last_name, a.title AS assignment_title, a.max_score, a.course_id
    FROM submissions s
    JOIN users u ON u.id = s.user_id
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.assignment_id = ? AND s.user_id = ?
  `).get(assignmentId, userId);
}

export function getSubmissionsForAssignment(assignmentId) {
  return db.prepare(`
    SELECT s.*, u.username, u.first_name, u.last_name, a.title AS assignment_title, a.max_score
    FROM submissions s
    JOIN users u ON u.id = s.user_id
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.assignment_id = ?
    ORDER BY s.submitted_at DESC
  `).all(assignmentId);
}

export function getSubmissionById(submissionId) {
  return db.prepare(`
    SELECT s.*, u.username, u.first_name, u.last_name, a.title AS assignment_title, a.max_score, a.course_id
    FROM submissions s
    JOIN users u ON u.id = s.user_id
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.id = ?
  `).get(submissionId);
}

export function saveSubmission(assignmentId, userId, payload = {}) {
  const existing = getUserSubmissionForAssignment(assignmentId, userId);
  const content = String(payload.content ?? payload.submissionText ?? '').trim();
  const fileUrl = payload.file_url || payload.fileUrl || null;

  if (existing) {
    db.prepare(`
      UPDATE submissions
      SET content = ?, file_url = ?, status = 'submitted', submitted_at = CURRENT_TIMESTAMP, score = NULL, feedback = NULL
      WHERE id = ?
    `).run(content, fileUrl, existing.id);

    return getSubmissionById(existing.id);
  }

  const result = db.prepare(`
    INSERT INTO submissions (assignment_id, user_id, content, file_url, status, submitted_at)
    VALUES (?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP)
  `).run(assignmentId, userId, content, fileUrl);

  return getSubmissionById(result.lastInsertRowid);
}

export function evaluateSubmission(submissionId, score, feedback) {
  db.prepare(`
    UPDATE submissions
    SET score = ?, feedback = ?, status = 'evaluated'
    WHERE id = ?
  `).run(score, feedback || '', submissionId);

  return getSubmissionById(submissionId);
}
