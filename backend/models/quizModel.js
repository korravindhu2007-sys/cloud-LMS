import { getDatabase } from '../config/db.js';

const db = getDatabase();

function normalizeQuestionInput(rawQuestion = {}) {
  const questionText = String(rawQuestion.questionText ?? rawQuestion.question_text ?? '').trim();
  const optionA = String(rawQuestion.optionA ?? rawQuestion.option_a ?? '').trim();
  const optionB = String(rawQuestion.optionB ?? rawQuestion.option_b ?? '').trim();
  const optionC = String(rawQuestion.optionC ?? rawQuestion.option_c ?? '').trim();
  const optionD = String(rawQuestion.optionD ?? rawQuestion.option_d ?? '').trim();
  const correctAnswer = String(rawQuestion.correctAnswer ?? rawQuestion.correct_answer ?? '').trim().toUpperCase();
  const points = Number(rawQuestion.points ?? rawQuestion.point_value ?? 1);

  if (!questionText) {
    throw new Error('Question text is required.');
  }

  const options = [optionA, optionB, optionC, optionD];
  if (options.some((option) => !option)) {
    throw new Error('Each question requires four answer options.');
  }

  if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
    throw new Error('Correct answer must be one of A, B, C, or D.');
  }

  return {
    questionText,
    optionA,
    optionB,
    optionC,
    optionD,
    correctAnswer,
    points: Number.isFinite(points) && points > 0 ? points : 1,
  };
}

export function getQuizById(quizId) {
  const quiz = db.prepare(`
    SELECT q.*, c.title AS course_title, c.faculty_id
    FROM quizzes q
    JOIN courses c ON c.id = q.course_id
    WHERE q.id = ?
  `).get(quizId);

  if (!quiz) {
    return null;
  }

  const questions = db.prepare(`
    SELECT *
    FROM questions
    WHERE quiz_id = ?
    ORDER BY id ASC
  `).all(quizId);

  return { ...quiz, questions };
}

export function getQuizzesByCourse(courseId) {
  const rows = db.prepare(`
    SELECT *
    FROM quizzes
    WHERE course_id = ?
    ORDER BY created_at DESC
  `).all(courseId);

  return rows.map((quiz) => getQuizById(quiz.id));
}

export function createQuiz(courseId, payload = {}) {
  const title = String(payload.title || '').trim();
  const description = String(payload.description || '').trim();
  const dueDate = payload.dueDate || payload.due_date || null;
  const questions = Array.isArray(payload.questions) ? payload.questions : [];

  if (!title) {
    throw new Error('Quiz title is required.');
  }

  if (!questions.length) {
    throw new Error('At least one quiz question is required.');
  }

  const result = db.prepare(`
    INSERT INTO quizzes (course_id, title, description, due_date)
    VALUES (?, ?, ?, ?)
  `).run(courseId, title, description, dueDate);

  const quizId = result.lastInsertRowid;
  const statement = db.prepare(`
    INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const rawQuestion of questions) {
    const normalized = normalizeQuestionInput(rawQuestion);
    statement.run(
      quizId,
      normalized.questionText,
      normalized.optionA,
      normalized.optionB,
      normalized.optionC,
      normalized.optionD,
      normalized.correctAnswer,
      normalized.points,
    );
  }

  return getQuizById(quizId);
}

export function getQuizAttemptById(attemptId) {
  const attempt = db.prepare(`
    SELECT qa.*, u.username
    FROM quiz_attempts qa
    JOIN users u ON u.id = qa.user_id
    WHERE qa.id = ?
  `).get(attemptId);

  if (!attempt) {
    return null;
  }

  const answers = db.prepare(`
    SELECT qa.id, qa.question_id, qa.selected_answer, qa.is_correct, q.question_text
    FROM quiz_answers qa
    JOIN questions q ON q.id = qa.question_id
    WHERE qa.attempt_id = ?
    ORDER BY qa.id ASC
  `).all(attemptId);

  return { ...attempt, answers };
}

export function getUserQuizAttemptForQuiz(quizId, userId) {
  return db.prepare(`
    SELECT *
    FROM quiz_attempts
    WHERE quiz_id = ? AND user_id = ?
    ORDER BY submitted_at DESC, id DESC
    LIMIT 1
  `).get(quizId, userId);
}

export function getQuizAttempts(quizId) {
  return db.prepare(`
    SELECT qa.id, qa.quiz_id, qa.user_id, qa.status, qa.score, qa.submitted_at,
           u.first_name, u.last_name, u.username
    FROM quiz_attempts qa
    JOIN users u ON u.id = qa.user_id
    WHERE qa.quiz_id = ?
    ORDER BY qa.submitted_at DESC, qa.id DESC
  `).all(quizId);
}

export function submitQuizAttempt(quizId, userId, answers = []) {
  const quiz = getQuizById(quizId);
  if (!quiz) {
    throw new Error('Quiz not found.');
  }

  const normalizedAnswers = Array.isArray(answers) ? answers : [];
  if (!normalizedAnswers.length) {
    throw new Error('Quiz answers are required.');
  }

  const questionMap = new Map(quiz.questions.map((question) => [String(question.id), question]));
  const answerRows = normalizedAnswers.map((answer) => {
    const questionId = Number(answer.questionId ?? answer.question_id);
    const selectedAnswer = String(answer.selectedAnswer ?? answer.selected_answer ?? '').trim().toUpperCase();
    const question = questionMap.get(String(questionId));

    if (!question) {
      throw new Error('One or more questions are invalid for this quiz.');
    }

    if (!['A', 'B', 'C', 'D'].includes(selectedAnswer)) {
      throw new Error('Each answer must be one of A, B, C, or D.');
    }

    const isCorrect = selectedAnswer === String(question.correct_answer || '').trim().toUpperCase();
    return {
      questionId,
      selectedAnswer,
      isCorrect: isCorrect ? 1 : 0,
      points: isCorrect ? Number(question.points || 1) : 0,
    };
  });

  const attemptInsert = db.prepare(`
    INSERT INTO quiz_attempts (quiz_id, user_id, status, score, submitted_at)
    VALUES (?, ?, 'submitted', 0, CURRENT_TIMESTAMP)
  `);

  const attempt = attemptInsert.run(quizId, userId);
  const attemptId = attempt.lastInsertRowid;
  const answerInsert = db.prepare(`
    INSERT INTO quiz_answers (attempt_id, question_id, selected_answer, is_correct)
    VALUES (?, ?, ?, ?)
  `);

  let totalScore = 0;
  for (const row of answerRows) {
    totalScore += row.points;
    answerInsert.run(attemptId, row.questionId, row.selectedAnswer, row.isCorrect);
  }

  const maximumPoints = quiz.questions.reduce((total, question) => total + Number(question.points || 1), 0);
  const finalScore = maximumPoints > 0 ? Math.min(totalScore, maximumPoints) : 0;
  const percent = maximumPoints > 0 ? (finalScore / maximumPoints) * 100 : 0;
  const grade = percent >= 90 ? 'A' : percent >= 80 ? 'B' : percent >= 70 ? 'C' : percent >= 60 ? 'D' : 'F';

  db.prepare(`
    UPDATE quiz_attempts
    SET score = ?, status = 'submitted'
    WHERE id = ?
  `).run(finalScore, attemptId);

  const course = db.prepare('SELECT id, faculty_id FROM courses WHERE id = ?').get(quiz.course_id);
  if (course) {
    db.prepare(`
      INSERT INTO results (user_id, course_id, assessment_type, assessment_id, score, grade)
      VALUES (?, ?, 'quiz', ?, ?, ?)
    `).run(userId, course.id, quizId, finalScore, grade);
  }

  return getQuizAttemptById(attemptId);
}
