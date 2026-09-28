import { getCourseById, isUserEnrolledInCourse } from '../models/courseModel.js';
import {
  createAssignment,
  deleteAssignment,
  evaluateSubmission,
  getAssignmentById,
  getAssignmentsByCourse,
  getSubmissionById,
  getSubmissionsForAssignment,
  getUserSubmissionForAssignment,
  saveSubmission,
} from '../models/assignmentModel.js';

function canAccessCourseForUser(user, courseId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'faculty') {
    const course = getCourseById(courseId);
    return Boolean(course) && Number(course.faculty_id) === Number(user.id);
  }
  return isUserEnrolledInCourse(user.id, courseId);
}

function canAccessAssignmentForUser(user, assignment) {
  if (!assignment || !user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'faculty') {
    const course = getCourseById(assignment.course_id);
    return Boolean(course) && Number(course.faculty_id) === Number(user.id);
  }
  return assignment.status === 'published' && isUserEnrolledInCourse(user.id, assignment.course_id);
}

export function listAssignmentsForCourseController(req, res, next) {
  try {
    const course = getCourseById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    if (!canAccessCourseForUser(req.user, course.id)) return res.status(403).json({ success: false, message: 'You do not have access to this course.' });

    const assignments = getAssignmentsByCourse(course.id);
    return res.json({
      success: true,
      assignments: req.user.role === 'student'
        ? assignments.filter((assignment) => assignment.status === 'published')
        : assignments,
    });
  } catch (error) {
    return next(error);
  }
}

export function createAssignmentController(req, res, next) {
  try {
    const course = getCourseById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only create assignments for courses you own.' });
    }

    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ success: false, message: 'Assignment title is required.' });
    const status = String(req.body.status || 'published').toLowerCase();
    if (!['published', 'draft'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Assignment status must be published or draft.' });
    }

    const maxScore = Number(req.body.maxScore ?? req.body.max_score ?? 100);
    const assignment = createAssignment(course.id, {
      title,
      description: req.body.description || '',
      dueDate: req.body.dueDate || req.body.due_date || null,
      maxScore: Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100,
      resourceUrl: req.body.resourceUrl || req.body.resource_url || '',
      status,
    });

    return res.status(201).json({ success: true, assignment });
  } catch (error) {
    return next(error);
  }
}

export function getAssignmentDetailController(req, res, next) {
  try {
    const assignment = getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    if (!canAccessAssignmentForUser(req.user, assignment)) return res.status(403).json({ success: false, message: 'You do not have access to this assignment.' });

    return res.json({ success: true, assignment });
  } catch (error) {
    return next(error);
  }
}

export function submitAssignmentController(req, res, next) {
  try {
    const assignment = getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    if (req.user.role !== 'student' && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only students can submit assignments.' });
    if (assignment.status !== 'published') return res.status(403).json({ success: false, message: 'This assignment is not published.' });
    if (!isUserEnrolledInCourse(req.user.id, assignment.course_id)) return res.status(403).json({ success: false, message: 'You must enroll in the course to submit this assignment.' });

    const content = String(req.body.content || req.body.submissionText || '').trim();
    if (!content) return res.status(400).json({ success: false, message: 'Submission content is required.' });

    const submission = saveSubmission(assignment.id, req.user.id, {
      content,
      fileUrl: req.body.fileUrl || req.body.file_url || null,
    });

    return res.status(201).json({ success: true, submission });
  } catch (error) {
    return next(error);
  }
}

export function getMySubmissionController(req, res, next) {
  try {
    const assignment = getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    if (!canAccessAssignmentForUser(req.user, assignment)) return res.status(403).json({ success: false, message: 'You do not have access to this assignment.' });

    if (req.user.role === 'faculty' || req.user.role === 'admin') {
      return res.json({ success: true, submissions: getSubmissionsForAssignment(assignment.id) });
    }

    const submission = getUserSubmissionForAssignment(assignment.id, req.user.id);
    if (!submission) return res.status(404).json({ success: false, message: 'You have not submitted this assignment yet.' });

    return res.json({ success: true, submission });
  } catch (error) {
    return next(error);
  }
}

export function getAssignmentSubmissionsController(req, res, next) {
  try {
    const assignment = getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only faculty or admins can view assignment submissions.' });

    const course = getCourseById(assignment.course_id);
    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not own this assignment.' });
    }

    return res.json({ success: true, submissions: getSubmissionsForAssignment(assignment.id) });
  } catch (error) {
    return next(error);
  }
}

export function evaluateSubmissionController(req, res, next) {
  try {
    const submission = getSubmissionById(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    const assignment = getAssignmentById(submission.assignment_id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only faculty or admins can evaluate submissions.' });

    const course = getCourseById(assignment.course_id);
    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not own this assignment.' });
    }

    const score = Number(req.body.score ?? req.body.grade ?? 0);
    if (!Number.isFinite(score) || score < 0 || score > Number(assignment.max_score || 100)) {
      return res.status(400).json({ success: false, message: `Score must be between 0 and ${assignment.max_score || 100}.` });
    }

    const feedback = String(req.body.feedback || '').trim();
    const updatedSubmission = evaluateSubmission(submission.id, score, feedback);
    return res.json({ success: true, submission: updatedSubmission });
  } catch (error) {
    return next(error);
  }
}

export function deleteAssignmentController(req, res, next) {
  try {
    const assignment = getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });

    const course = getCourseById(assignment.course_id);
    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not own this assignment.' });
    }

    deleteAssignment(assignment.id);
    return res.json({ success: true, message: 'Assignment deleted successfully.' });
  } catch (error) {
    return next(error);
  }
}
