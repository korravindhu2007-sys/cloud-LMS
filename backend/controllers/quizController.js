import { getCourseById, isUserEnrolledInCourse } from '../models/courseModel.js';
import {
  createQuiz,
  getQuizById,
  getQuizAttempts,
  getQuizzesByCourse,
  getUserQuizAttemptForQuiz,
  submitQuizAttempt,
} from '../models/quizModel.js';

function hideCorrectAnswers(quiz) {
  return {
    ...quiz,
    questions: quiz.questions.map((question) => Object.fromEntries(
      Object.entries(question).filter(([key]) => key !== 'correct_answer' && key !== 'correctAnswer'),
    )),
  };
}

export function listQuizzesForCourseController(req, res, next) {
  try {
    const course = getCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (req.user.role === 'student' && !isUserEnrolledInCourse(req.user.id, course.id)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this course.' });
    }

    if (req.user.role === 'faculty' && Number(course.faculty_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You do not have access to this course.' });
    }

    const quizzes = getQuizzesByCourse(course.id).map((quiz) => {
      if (req.user.role === 'student') {
        return {
          ...hideCorrectAnswers(quiz),
          myAttempt: getUserQuizAttemptForQuiz(quiz.id, req.user.id) || null,
        };
      }

      if (req.user.role === 'faculty') {
        return { ...quiz, attempts: getQuizAttempts(quiz.id) };
      }

      return quiz;
    });

    return res.json({ success: true, quizzes });
  } catch (error) {
    return next(error);
  }
}

export function createQuizController(req, res, next) {
  try {
    const course = getCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (req.user.role !== 'admin' && Number(course.faculty_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only create quizzes for courses you own.' });
    }

    const quiz = createQuiz(course.id, req.body);
    return res.status(201).json({ success: true, quiz });
  } catch (error) {
    return next(error);
  }
}

export function getQuizDetailController(req, res, next) {
  try {
    const quiz = getQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    if (req.user.role === 'student' && !isUserEnrolledInCourse(req.user.id, quiz.course_id)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this quiz.' });
    }

    if (req.user.role === 'faculty' && Number(quiz.faculty_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You do not own this quiz.' });
    }

    if (req.user.role === 'student') {
      return res.json({
        success: true,
        quiz: {
          ...hideCorrectAnswers(quiz),
          myAttempt: getUserQuizAttemptForQuiz(quiz.id, req.user.id) || null,
        },
      });
    }

    return res.json({ success: true, quiz });
  } catch (error) {
    return next(error);
  }
}

export function getQuizAttemptsController(req, res, next) {
  try {
    const quiz = getQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    if (req.user.role !== 'admin' && (req.user.role !== 'faculty' || Number(quiz.faculty_id) !== Number(req.user.id))) {
      return res.status(403).json({ success: false, message: 'You do not own this quiz.' });
    }

    return res.json({ success: true, attempts: getQuizAttempts(quiz.id) });
  } catch (error) {
    return next(error);
  }
}

export function submitQuizAttemptController(req, res, next) {
  try {
    const quiz = getQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    if (req.user.role !== 'student' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only students can submit quiz attempts.' });
    }

    if (req.user.role !== 'admin' && !isUserEnrolledInCourse(req.user.id, quiz.course_id)) {
      return res.status(403).json({ success: false, message: 'You must enroll in the course to take this quiz.' });
    }

    const attempt = submitQuizAttempt(quiz.id, req.user.id, req.body.answers || req.body.choices || []);
    return res.status(201).json({ success: true, attempt });
  } catch (error) {
    return next(error);
  }
}
