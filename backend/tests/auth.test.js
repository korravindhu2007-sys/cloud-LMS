process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'node:fs/promises';

const { default: app } = await import('../server.js');
const { default: bcrypt } = await import('bcryptjs');
const { createUser } = await import('../models/userModel.js');
const { getDatabase } = await import('../config/db.js');
const { removeCourseUpload } = await import('../services/courseUploadService.js');
const { courseUploadDirectory } = await import('../services/courseUploadService.js');
const { seedDemoData } = await import('../services/seedService.js');
const { demoFaculty, seedFullDemoData } = await import('../seedDemoData.js');
const { seedDemoStudents } = await import('../seedStudents.js');
const { courseContentPlan } = await import('../courseContentPlan.js');
const { seedCourseContent } = await import('../seedCourseContent.js');

await seedDemoData();

let studentToken;
let createdCourseId;

test('POST /auth/register creates a new user', async () => {
  const res = await request(app)
    .post('/auth/register')
    .send({
      firstName: 'Demo',
      lastName: 'Student',
      email: 'demo.student@example.com',
      username: 'demo_student',
      password: 'DemoPass123!',
      role: 'student',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.ok(res.body.user);
  assert.equal(res.body.user.role, 'student');
});

test('POST /auth/register rejects faculty and admin roles', async () => {
  for (const role of ['faculty', 'admin']) {
    const res = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'Blocked',
        lastName: role,
        email: `blocked.${role}@example.com`,
        username: `blocked_${role}`,
        password: 'StudentPass123!',
        role,
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  }
});

test('POST /auth/login returns a token for valid credentials', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({
      username: 'demo_student',
      password: 'DemoPass123!',
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.token);
  studentToken = res.body.token;
});

test('POST /auth/login accepts an email address', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({
      username: 'demo.student@example.com',
      password: 'DemoPass123!',
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.username, 'demo_student');
});

test('POST /auth/login rejects invalid credentials', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({
      username: 'demo_student',
      password: 'WrongPass123!',
    });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('GET /auth/me requires authentication', async () => {
  const res = await request(app).get('/auth/me');

  assert.equal(res.status, 401);
});

test('GET /auth/me returns the current authenticated user', async () => {
  const res = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${studentToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.user.username, 'demo_student');
});

test('Student cannot access faculty-only route', async () => {
  const res = await request(app)
    .get('/admin/users')
    .set('Authorization', `Bearer ${studentToken}`);

  assert.equal(res.status, 403);
});

// admin login and course creation
test('Admin login obtains admin token', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({
      username: 'admin',
      password: 'AdminPass123!',
    });

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.role, 'admin');
});

test('Configured Admin account works with Admin/admin@123 credentials', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({
      username: 'Admin',
      password: 'admin@123',
    });

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.username, 'Admin');
  assert.equal(res.body.user.role, 'admin');
});

test('Faculty can create a course', async () => {
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });
  assert.equal(facultyLogin.body.user.age, 47);

  const res = await request(app)
    .post('/courses')
    .set('Authorization', `Bearer ${facultyLogin.body.token}`)
    .send({
      title: 'Cloud Architecture Basics',
      description: 'Introductory cloud architecture concepts',
      code: 'CLOUD-101',
      credits: 3,
      status: 'published',
    });

  assert.equal(res.status, 201);
  createdCourseId = res.body.course.id;
  assert.ok(createdCourseId);
});

test('GET /courses returns at least one course', async () => {
  const res = await request(app).get('/courses');

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.courses));
  assert.ok(res.body.courses.length >= 1);
});

test('GET /courses/:id requires authentication', async () => {
  const res = await request(app).get(`/courses/${createdCourseId}`);

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('Student can enroll in a course', async () => {
  const res = await request(app)
    .post(`/courses/${createdCourseId}/enroll`)
    .set('Authorization', `Bearer ${studentToken}`);

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
});

test('POST /auth/logout clears the session/token', async () => {
  const res = await request(app)
    .post('/auth/logout')
    .set('Authorization', `Bearer ${studentToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

// Phase 3 learning workflow tests

test('Faculty can create a module for a course', async () => {
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  const moduleRes = await request(app)
    .post(`/courses/${createdCourseId}/modules`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`)
    .send({
      title: 'Introduction to Scaling',
      description: 'Core concepts for scaling services.',
    });

  assert.equal(moduleRes.status, 201);
  assert.equal(moduleRes.body.success, true);
  assert.ok(moduleRes.body.module.id);
});

test('Faculty can create a lesson inside a module', async () => {
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  const moduleList = await request(app)
    .get(`/courses/${createdCourseId}/modules`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`);

  const moduleId = moduleList.body.modules[0].id;

  const lessonRes = await request(app)
    .post(`/modules/${moduleId}/lessons`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`)
    .send({
      title: 'Auto scaling basics',
      content: 'Scaling helps absorb traffic spikes while preserving reliability.',
      lessonOrder: 1,
    });

  assert.equal(lessonRes.status, 201);
  assert.equal(lessonRes.body.success, true);
  assert.ok(lessonRes.body.lesson.id);
});

test('Faculty can post an announcement for an owned course', async () => {
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  const res = await request(app)
    .post(`/courses/${createdCourseId}/announcements`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`)
    .send({ title: 'Course update', content: 'The first lab is available now.' });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.announcement.title, 'Course update');
});

test('Student can access course modules and lesson content', async () => {
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });

  const modulesRes = await request(app)
    .get(`/courses/${createdCourseId}/modules`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  assert.equal(modulesRes.status, 200);
  assert.ok(Array.isArray(modulesRes.body.modules));
  assert.ok(modulesRes.body.modules.length >= 1);

  const lessonRes = await request(app)
    .get(`/modules/${modulesRes.body.modules[0].id}/lessons`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  assert.equal(lessonRes.status, 200);
  assert.ok(Array.isArray(lessonRes.body.lessons));
});

test('Student can complete a lesson and progress updates', async () => {
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });

  const modulesRes = await request(app)
    .get(`/courses/${createdCourseId}/modules`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  const lessonId = modulesRes.body.modules[0].lessons[0].id;

  const completeRes = await request(app)
    .post(`/lessons/${lessonId}/complete`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  assert.equal(completeRes.status, 200);
  assert.equal(completeRes.body.success, true);

  const progressRes = await request(app)
    .get(`/courses/${createdCourseId}/progress`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  assert.equal(progressRes.status, 200);
  assert.ok(progressRes.body.progress >= 0);
});

test('Duplicate lesson completion is prevented', async () => {
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });

  const modulesRes = await request(app)
    .get(`/courses/${createdCourseId}/modules`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  const lessonId = modulesRes.body.modules[0].lessons[0].id;

  const secondComplete = await request(app)
    .post(`/lessons/${lessonId}/complete`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  assert.equal(secondComplete.status, 200);
  assert.equal(secondComplete.body.success, true);
  assert.ok(
    secondComplete.body.message.includes('already') || secondComplete.body.message.includes('complete'),
  );
});

let assignmentId;
let assignmentSubmissionId;
let otherFacultyCourseId;

test('Faculty creates assignment for own course', async () => {
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  const res = await request(app)
    .post(`/courses/${createdCourseId}/assignments`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`)
    .send({
      title: 'Cloud Lab Report',
      description: 'Prepare a concise cloud deployment report for the course case study.',
      dueDate: '2026-12-31',
      maxScore: 100,
      resourceUrl: 'https://example.com/cloud-lab-reference.pdf',
      status: 'published',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.ok(res.body.assignment.id);
  assert.equal(res.body.assignment.resource_url, 'https://example.com/cloud-lab-reference.pdf');
  assert.equal(res.body.assignment.status, 'published');
  assignmentId = res.body.assignment.id;
});

test('Students cannot see or submit draft practice assignments', async () => {
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });
  const draft = await request(app)
    .post(`/courses/${createdCourseId}/assignments`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`)
    .send({ title: 'Unpublished practice', description: 'A draft.', maxScore: 10, status: 'draft' });

  assert.equal(draft.status, 201);
  const list = await request(app)
    .get(`/courses/${createdCourseId}/assignments`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);
  assert.equal(list.body.assignments.some((assignment) => assignment.id === draft.body.assignment.id), false);

  const detail = await request(app)
    .get(`/assignments/${draft.body.assignment.id}`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);
  assert.equal(detail.status, 403);

  const submission = await request(app)
    .post(`/assignments/${draft.body.assignment.id}/submissions`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`)
    .send({ content: 'This draft must not accept work.' });
  assert.equal(submission.status, 403);
});

test('Faculty cannot create assignment for another faculty\'s course', async () => {
  const facultyTwo = createUser({
    firstName: 'Second',
    lastName: 'Faculty',
    email: 'second.faculty@example.com',
    username: 'faculty2',
    passwordHash: await bcrypt.hash('1234', 10),
    role: 'faculty',
  });

  const adminLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'admin', password: 'AdminPass123!' });

  const courseRes = await request(app)
    .post('/courses')
    .set('Authorization', `Bearer ${adminLogin.body.token}`)
    .send({
      title: 'Advanced DevOps',
      description: 'DevOps practices and automation workflows.',
      code: 'DEVOPS-202',
      credits: 3,
      status: 'published',
      facultyId: facultyTwo.id,
    });

  assert.equal(courseRes.status, 201);
  otherFacultyCourseId = courseRes.body.course.id;

  const facultyOneLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  const res = await request(app)
    .post(`/courses/${otherFacultyCourseId}/assignments`)
    .set('Authorization', `Bearer ${facultyOneLogin.body.token}`)
    .send({
      title: 'Unauthorized assignment',
      description: 'This should fail.',
      dueDate: '2026-12-15',
      maxScore: 50,
    });

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('Faculty cannot read another faculty course roster or content', async () => {
  const facultyOneLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  for (const endpoint of [
    `/courses/${otherFacultyCourseId}`,
    `/courses/${otherFacultyCourseId}/modules`,
    `/courses/${otherFacultyCourseId}/materials`,
    `/courses/${otherFacultyCourseId}/students`,
    `/courses/${otherFacultyCourseId}/progress`,
  ]) {
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${facultyOneLogin.body.token}`);

    assert.equal(res.status, 403, endpoint);
  }
});

test('Faculty cannot access or create quizzes for another faculty course', async () => {
  const facultyOne = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });
  const facultyTwo = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty2', password: '1234' });
  const createdQuiz = await request(app)
    .post(`/courses/${otherFacultyCourseId}/quizzes`)
    .set('Authorization', `Bearer ${facultyTwo.body.token}`)
    .send({
      title: 'Private course quiz',
      questions: [{ questionText: 'Question?', optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', correctAnswer: 'A', points: 10 }],
    });

  assert.equal(createdQuiz.status, 201);
  for (const endpoint of [
    `/courses/${otherFacultyCourseId}/quizzes`,
    `/quizzes/${createdQuiz.body.quiz.id}`,
    `/quizzes/${createdQuiz.body.quiz.id}/attempts`,
  ]) {
    const response = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${facultyOne.body.token}`);
    assert.equal(response.status, 403, endpoint);
  }

  const blockedCreate = await request(app)
    .post(`/courses/${otherFacultyCourseId}/quizzes`)
    .set('Authorization', `Bearer ${facultyOne.body.token}`)
    .send({ title: 'Unauthorized quiz', questions: [] });
  assert.equal(blockedCreate.status, 403);
});

test('Course updates ignore ownership fields', async () => {
  const facultyOneLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  const res = await request(app)
    .put(`/courses/${createdCourseId}`)
    .set('Authorization', `Bearer ${facultyOneLogin.body.token}`)
    .send({ title: 'Cloud Architecture Updated', faculty_id: 999999 });

  assert.equal(res.status, 200);
  assert.equal(res.body.course.title, 'Cloud Architecture Updated');
  assert.equal(res.body.course.faculty_id, 2);
});

test('Student can view assignment when enrolled', async () => {
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });

  const res = await request(app)
    .get(`/assignments/${assignmentId}`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.assignment.id, assignmentId);
});

test('Student cannot access assignment from unauthorized course', async () => {
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });

  const facultyTwoLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty2', password: '1234' });

  const unauthorizedAssignment = await request(app)
    .post(`/courses/${otherFacultyCourseId}/assignments`)
    .set('Authorization', `Bearer ${facultyTwoLogin.body.token}`)
    .send({
      title: 'Unauthorized course assignment',
      description: 'This assignment must remain private.',
      dueDate: '2026-12-15',
      maxScore: 100,
    });

  const res = await request(app)
    .get(`/assignments/${unauthorizedAssignment.body.assignment.id}`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('Student submits assignment', async () => {
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });

  const res = await request(app)
    .post(`/assignments/${assignmentId}/submissions`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`)
    .send({
      content: 'I created a deployment report with scaling and resilience recommendations.',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.ok(res.body.submission.id);
  assignmentSubmissionId = res.body.submission.id;
});

test('Student can view own submission', async () => {
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });

  const res = await request(app)
    .get(`/assignments/${assignmentId}/my-submission`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.submission.assignment_id, assignmentId);
});

test('Student cannot view another student submission', async () => {
  const studentTwoLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'student2', password: 'StudentPass123!' });

  const res = await request(app)
    .get(`/assignments/${assignmentId}/submissions`)
    .set('Authorization', `Bearer ${studentTwoLogin.body.token}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('Faculty can view submissions for own assignment', async () => {
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  const res = await request(app)
    .get(`/assignments/${assignmentId}/submissions`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.submissions));
  assert.ok(res.body.submissions.length >= 1);
});

test('Faculty can evaluate submission', async () => {
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  const res = await request(app)
    .post(`/submissions/${assignmentSubmissionId}/evaluate`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`)
    .send({
      score: 92,
      feedback: 'Strong work. Your explanation was clear and measurable.',
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.submission.score, 92);
  assert.ok(res.body.submission.feedback);
});

test('Faculty can grade only submissions from their own courses', async () => {
  const [facultyOne, facultyTwo, student] = await Promise.all([
    request(app).post('/auth/login').send({ username: 'faculty1', password: '1234' }),
    request(app).post('/auth/login').send({ username: 'faculty2', password: '1234' }),
    request(app).post('/auth/login').send({ username: 'demo_student', password: 'DemoPass123!' }),
  ]);
  await request(app)
    .post(`/courses/${otherFacultyCourseId}/enroll`)
    .set('Authorization', `Bearer ${student.body.token}`);

  const assignment = await request(app)
    .post(`/courses/${otherFacultyCourseId}/assignments`)
    .set('Authorization', `Bearer ${facultyTwo.body.token}`)
    .send({ title: 'Faculty B practice', description: 'Explain the course topic.', maxScore: 10 });
  const submission = await request(app)
    .post(`/assignments/${assignment.body.assignment.id}/submissions`)
    .set('Authorization', `Bearer ${student.body.token}`)
    .send({ content: 'Student work for Faculty B.' });

  const blockedList = await request(app)
    .get(`/assignments/${assignment.body.assignment.id}/submissions`)
    .set('Authorization', `Bearer ${facultyOne.body.token}`);
  const blockedGrade = await request(app)
    .post(`/submissions/${submission.body.submission.id}/evaluate`)
    .set('Authorization', `Bearer ${facultyOne.body.token}`)
    .send({ score: 8, feedback: 'Not the course owner.' });
  assert.equal(blockedList.status, 403);
  assert.equal(blockedGrade.status, 403);

  const ownerGrade = await request(app)
    .post(`/submissions/${submission.body.submission.id}/evaluate`)
    .set('Authorization', `Bearer ${facultyTwo.body.token}`)
    .send({ score: 8, feedback: 'Reviewed by the course owner.' });
  assert.equal(ownerGrade.status, 200);
  assert.equal(ownerGrade.body.submission.score, 8);
});

test('Marks cannot exceed maximum marks', async () => {
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  const res = await request(app)
    .post(`/submissions/${assignmentSubmissionId}/evaluate`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`)
    .send({
      score: 150,
      feedback: 'This should fail validation.',
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('Student can view evaluated marks', async () => {
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });

  const res = await request(app)
    .get(`/assignments/${assignmentId}/my-submission`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.submission.score, 92);
});

test('Student can view faculty feedback', async () => {
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });

  const res = await request(app)
    .get(`/assignments/${assignmentId}/my-submission`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.match(res.body.submission.feedback, /Strong work/i);
});

let createdQuizId;

test('Student quiz flow hides answers, grades submissions, and scopes faculty results', async () => {
  const facultyOne = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });
  const quizRes = await request(app)
    .post(`/courses/${createdCourseId}/quizzes`)
    .set('Authorization', `Bearer ${facultyOne.body.token}`)
    .send({
      title: 'Cloud concepts quiz',
      questions: [{
        questionText: 'Which option is correct?',
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctAnswer: 'B',
        points: 12,
      }],
    });

  assert.equal(quizRes.status, 201);
  createdQuizId = quizRes.body.quiz.id;

  const student = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });
  const studentQuiz = await request(app)
    .get(`/quizzes/${createdQuizId}`)
    .set('Authorization', `Bearer ${student.body.token}`);

  assert.equal(studentQuiz.status, 200);
  assert.equal('correct_answer' in studentQuiz.body.quiz.questions[0], false);
  assert.equal('correctAnswer' in studentQuiz.body.quiz.questions[0], false);

  const unEnrolledStudent = await request(app)
    .post('/auth/login')
    .send({ username: 'student2', password: 'StudentPass123!' });
  const hiddenFromUnEnrolledStudent = await request(app)
    .get(`/courses/${createdCourseId}/quizzes`)
    .set('Authorization', `Bearer ${unEnrolledStudent.body.token}`);
  assert.equal(hiddenFromUnEnrolledStudent.status, 403);

  const attempt = await request(app)
    .post(`/quizzes/${createdQuizId}/attempts`)
    .set('Authorization', `Bearer ${student.body.token}`)
    .send({ answers: [{ questionId: studentQuiz.body.quiz.questions[0].id, selectedAnswer: 'B' }] });

  assert.equal(attempt.status, 201);
  assert.equal(attempt.body.attempt.score, 12);
  const refreshedQuiz = await request(app)
    .get(`/courses/${createdCourseId}/quizzes`)
    .set('Authorization', `Bearer ${student.body.token}`);
  assert.equal(refreshedQuiz.body.quizzes[0].myAttempt.score, 12);

  const results = await request(app)
    .get(`/quizzes/${createdQuizId}/attempts`)
    .set('Authorization', `Bearer ${facultyOne.body.token}`);
  assert.equal(results.status, 200);
  assert.equal(results.body.attempts[0].score, 12);
  assert.equal(results.body.attempts[0].username, 'demo_student');

  const facultyTwo = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty2', password: '1234' });
  const deniedResults = await request(app)
    .get(`/quizzes/${createdQuizId}/attempts`)
    .set('Authorization', `Bearer ${facultyTwo.body.token}`);
  assert.equal(deniedResults.status, 403);
});

test('Faculty can add a course material resource', async () => {
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  const res = await request(app)
    .post(`/courses/${createdCourseId}/materials`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`)
    .send({
      title: 'Cloud Notes PDF',
      fileUrl: 'https://example.com/cloud-notes.pdf',
      fileType: 'pdf',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.material.title, 'Cloud Notes PDF');
});

test('Faculty can upload a course file and only enrolled students can download it', async () => {
  const [facultyOne, facultyTwo, enrolledStudent, unEnrolledStudent] = await Promise.all([
    request(app).post('/auth/login').send({ username: 'faculty1', password: '1234' }),
    request(app).post('/auth/login').send({ username: 'faculty2', password: '1234' }),
    request(app).post('/auth/login').send({ username: 'demo_student', password: 'DemoPass123!' }),
    request(app).post('/auth/login').send({ username: 'student2', password: 'StudentPass123!' }),
  ]);
  const pdf = Buffer.from('%PDF-1.4\nCloud course notes\n%%EOF');
  let storageKey = '';

  try {
    const uploaded = await request(app)
      .post(`/courses/${createdCourseId}/materials`)
      .set('Authorization', `Bearer ${facultyOne.body.token}`)
      .field('title', 'Uploaded Course Notes')
      .field('fileType', 'pdf')
      .attach('file', pdf, { filename: 'course-notes.pdf', contentType: 'application/pdf' });

    assert.equal(uploaded.status, 201);
    storageKey = uploaded.body.material.file_url;
    assert.match(storageKey, /^upload:\d+\/[0-9a-f-]+\.pdf$/i);

    const enrolledMaterials = await request(app)
      .get(`/courses/${createdCourseId}/materials`)
      .set('Authorization', `Bearer ${enrolledStudent.body.token}`);
    assert.equal(enrolledMaterials.status, 200);
    assert.ok(enrolledMaterials.body.materials.some((item) => item.id === uploaded.body.material.id));

    const downloaded = await request(app)
      .get(`/materials/${uploaded.body.material.id}/file`)
      .set('Authorization', `Bearer ${enrolledStudent.body.token}`);
    assert.equal(downloaded.status, 200);
    assert.match(downloaded.headers['content-type'], /application\/pdf/);

    const denied = await request(app)
      .get(`/materials/${uploaded.body.material.id}/file`)
      .set('Authorization', `Bearer ${unEnrolledStudent.body.token}`);
    assert.equal(denied.status, 403);

    const foreignUpload = await request(app)
      .post(`/courses/${createdCourseId}/materials`)
      .set('Authorization', `Bearer ${facultyTwo.body.token}`)
      .field('title', 'Unauthorized upload')
      .attach('file', pdf, { filename: 'blocked.pdf', contentType: 'application/pdf' });
    assert.equal(foreignUpload.status, 403);

    const disguisedExecutable = await request(app)
      .post(`/courses/${createdCourseId}/materials`)
      .set('Authorization', `Bearer ${facultyOne.body.token}`)
      .field('title', 'Invalid executable')
      .attach('file', Buffer.from('MZ executable payload'), { filename: 'notes.pdf', contentType: 'application/pdf' });
    assert.equal(disguisedExecutable.status, 400);
  } finally {
    if (storageKey) await removeCourseUpload(storageKey);
  }
});

test('Faculty can view enrolled students for their course', async () => {
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  const res = await request(app)
    .get(`/courses/${createdCourseId}/students`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.students));
});

test('Student can view announcements for their enrolled courses', async () => {
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });

  const res = await request(app)
    .get('/announcements/my')
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.announcements));
});

test('Unauthorized user cannot perform protected assignment operations', async () => {
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'demo_student', password: 'DemoPass123!' });

  const res = await request(app)
    .delete(`/assignments/${assignmentId}`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('Faculty cannot mutate another faculty course content or announcements', async () => {
  const [facultyOneLogin, facultyTwoLogin] = await Promise.all([
    request(app).post('/auth/login').send({ username: 'faculty1', password: '1234' }),
    request(app).post('/auth/login').send({ username: 'faculty2', password: '1234' }),
  ]);

  const otherModuleRes = await request(app)
    .post(`/courses/${otherFacultyCourseId}/modules`)
    .set('Authorization', `Bearer ${facultyTwoLogin.body.token}`)
    .send({ title: 'Private DevOps Module', description: 'Only its owner may manage this module.' });

  assert.equal(otherModuleRes.status, 201);
  const otherModuleId = otherModuleRes.body.module.id;

  const otherLessonRes = await request(app)
    .post(`/modules/${otherModuleId}/lessons`)
    .set('Authorization', `Bearer ${facultyTwoLogin.body.token}`)
    .send({ title: 'Private DevOps Lesson', content: 'Restricted course content.', lessonOrder: 1 });

  assert.equal(otherLessonRes.status, 201);
  const otherLessonId = otherLessonRes.body.lesson.id;

  const blockedRequests = [
    request(app)
      .post(`/courses/${otherFacultyCourseId}/modules`)
      .set('Authorization', `Bearer ${facultyOneLogin.body.token}`)
      .send({ title: 'Unauthorized module' }),
    request(app)
      .post(`/courses/${otherFacultyCourseId}/materials`)
      .set('Authorization', `Bearer ${facultyOneLogin.body.token}`)
      .send({ title: 'Unauthorized material', fileUrl: 'https://example.com/private.pdf' }),
    request(app)
      .post(`/courses/${otherFacultyCourseId}/announcements`)
      .set('Authorization', `Bearer ${facultyOneLogin.body.token}`)
      .send({ title: 'Unauthorized announcement', content: 'This must not be published.' }),
    request(app)
      .put(`/modules/${otherModuleId}`)
      .set('Authorization', `Bearer ${facultyOneLogin.body.token}`)
      .send({ title: 'Unauthorized module update' }),
    request(app)
      .post(`/modules/${otherModuleId}/lessons`)
      .set('Authorization', `Bearer ${facultyOneLogin.body.token}`)
      .send({ title: 'Unauthorized lesson' }),
    request(app)
      .put(`/lessons/${otherLessonId}`)
      .set('Authorization', `Bearer ${facultyOneLogin.body.token}`)
      .send({ title: 'Unauthorized lesson update' }),
  ];

  for (const responsePromise of blockedRequests) {
    const res = await responsePromise;
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  }
});

test('Faculty can edit and delete their own lesson but not another faculty lesson', async () => {
  const [facultyOne, facultyTwo] = await Promise.all([
    request(app).post('/auth/login').send({ username: 'faculty1', password: '1234' }),
    request(app).post('/auth/login').send({ username: 'faculty2', password: '1234' }),
  ]);
  const ownModule = await request(app)
    .post(`/courses/${createdCourseId}/modules`)
    .set('Authorization', `Bearer ${facultyOne.body.token}`)
    .send({ title: 'Lesson edit test module' });
  const ownLesson = await request(app)
    .post(`/modules/${ownModule.body.module.id}/lessons`)
    .set('Authorization', `Bearer ${facultyOne.body.token}`)
    .send({ title: 'Draft lesson', content: 'Original description', lessonOrder: 1 });

  const updated = await request(app)
    .put(`/lessons/${ownLesson.body.lesson.id}`)
    .set('Authorization', `Bearer ${facultyOne.body.token}`)
    .send({ title: 'Revised lesson', content: 'Updated description' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.lesson.title, 'Revised lesson');
  assert.equal(updated.body.lesson.content, 'Updated description');

  const foreignModule = await request(app)
    .post(`/courses/${otherFacultyCourseId}/modules`)
    .set('Authorization', `Bearer ${facultyTwo.body.token}`)
    .send({ title: 'Foreign lesson edit test module' });
  const foreignLesson = await request(app)
    .post(`/modules/${foreignModule.body.module.id}/lessons`)
    .set('Authorization', `Bearer ${facultyTwo.body.token}`)
    .send({ title: 'Foreign lesson', content: 'Owner-only lesson.', lessonOrder: 1 });

  for (const response of [
    request(app).put(`/lessons/${foreignLesson.body.lesson.id}`).set('Authorization', `Bearer ${facultyOne.body.token}`).send({ title: 'Blocked edit' }),
    request(app).delete(`/lessons/${foreignLesson.body.lesson.id}`).set('Authorization', `Bearer ${facultyOne.body.token}`),
  ]) {
    assert.equal((await response).status, 403);
  }

  assert.equal((await request(app).delete(`/lessons/${ownLesson.body.lesson.id}`).set('Authorization', `Bearer ${facultyOne.body.token}`)).status, 200);
  await request(app).delete(`/modules/${ownModule.body.module.id}`).set('Authorization', `Bearer ${facultyOne.body.token}`);
  await request(app).delete(`/modules/${foreignModule.body.module.id}`).set('Authorization', `Bearer ${facultyTwo.body.token}`);
});

test('Course-content updates whitelist ownership and relationship fields', async () => {
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'faculty1', password: '1234' });

  const modulesRes = await request(app)
    .get(`/courses/${createdCourseId}/modules`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`);

  const module = modulesRes.body.modules[0];
  const lesson = module.lessons[0];

  const moduleUpdate = await request(app)
    .put(`/modules/${module.id}`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`)
    .send({ title: 'Updated Scaling Module', course_id: otherFacultyCourseId });

  assert.equal(moduleUpdate.status, 200);
  assert.equal(moduleUpdate.body.module.title, 'Updated Scaling Module');
  assert.equal(moduleUpdate.body.module.course_id, createdCourseId);

  const lessonUpdate = await request(app)
    .put(`/lessons/${lesson.id}`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`)
    .send({ title: 'Updated Scaling Lesson', module_id: 999999 });

  assert.equal(lessonUpdate.status, 200);
  assert.equal(lessonUpdate.body.lesson.title, 'Updated Scaling Lesson');
  assert.equal(lessonUpdate.body.lesson.module_id, module.id);
});

test('Student demo seed is idempotent and uses the initial password', async () => {
  const firstRun = await seedDemoStudents();
  const secondRun = await seedDemoStudents();

  assert.equal(firstRun.inserted, 30);
  assert.equal(secondRun.inserted, 0);
  assert.equal(secondRun.skipped, 30);

  const login = await request(app)
    .post('/auth/login')
    .send({ username: 'aarav.mehta', password: '1234' });

  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, 'student');
});

test('Faculty can create a quiz and students can complete it for an owned course', async () => {
  const db = getDatabase();
  const facultyLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'anuj.kapoor', password: '1234' });

  assert.equal(facultyLogin.status, 200);
  assert.equal(facultyLogin.body.user.role, 'faculty');

  const course = db.prepare(`
    SELECT c.id
    FROM courses c
    JOIN users u ON u.id = c.faculty_id
    WHERE u.username = ?
    ORDER BY c.id
    LIMIT 1
  `).get('anuj.kapoor');

  assert.ok(course);

  const createQuiz = await request(app)
    .post(`/courses/${course.id}/quizzes`)
    .set('Authorization', `Bearer ${facultyLogin.body.token}`)
    .send({
      title: 'Cloud Basics Quiz',
      description: 'Check understanding of cloud fundamentals.',
      dueDate: '2026-12-31',
      questions: [
        {
          questionText: 'Which cloud model provides on-demand access over the internet?',
          optionA: 'Local server',
          optionB: 'Cloud computing',
          optionC: 'Dedicated appliance',
          optionD: 'Offline laptop',
          correctAnswer: 'B',
          points: 2,
        },
      ],
    });

  assert.equal(createQuiz.status, 201);
  assert.equal(createQuiz.body.success, true);
  assert.ok(createQuiz.body.quiz.id);

  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'aarav.mehta', password: '1234' });

  assert.equal(studentLogin.status, 200);

  const quizResult = await request(app)
    .post(`/quizzes/${createQuiz.body.quiz.id}/attempts`)
    .set('Authorization', `Bearer ${studentLogin.body.token}`)
    .send({
      answers: [
        { questionId: createQuiz.body.quiz.questions[0].id, selectedAnswer: 'B' },
      ],
    });

  assert.equal(quizResult.status, 201);
  assert.equal(quizResult.body.success, true);
  assert.ok(quizResult.body.attempt.score >= 2);
});

test('Full demo seed is idempotent and faculty rosters remain course-scoped', async () => {
  const db = getDatabase();
  const legacyFaculty = createUser({
    firstName: 'CORS',
    lastName: 'Faculty',
    email: 'corsfaculty2@example.com',
    username: 'corsfaculty2',
    passwordHash: await bcrypt.hash('1234', 10),
    role: 'faculty',
  });
  const insertLegacyCourse = db.prepare(`
    INSERT INTO courses (title, description, code, credits, status, faculty_id)
    VALUES (?, ?, ?, 3, 'published', ?)
  `);
  const legacyCourseIds = [1, 2].map((ordinal) => insertLegacyCourse.run(
    `Applied Computing Studio ${ordinal}`,
    'A permanent applied computing course for CORS Faculty.',
    `FAC1249${ordinal}`,
    legacyFaculty.id,
  ).lastInsertRowid);
  const legacyStudents = db.prepare(`
    SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'student' ORDER BY u.id LIMIT 2
  `).all();
  const insertLegacyEnrollment = db.prepare("INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'completed')");
  for (const courseId of legacyCourseIds) {
    for (const student of legacyStudents) {
      insertLegacyEnrollment.run(student.id, courseId);
    }
  }

  const firstRun = await seedFullDemoData();
  const secondRun = await seedFullDemoData();

  assert.equal(firstRun.facultyInserted, 10);
  assert.equal(firstRun.legacyFacultyCoursesReassigned, 2);
  assert.ok(firstRun.coursesInserted >= 20);
  assert.equal(secondRun.facultyInserted, 0);
  assert.equal(secondRun.legacyFacultyCoursesReassigned, 0);
  assert.equal(secondRun.studentsInserted, 0);
  assert.equal(secondRun.coursesInserted, 0);
  assert.equal(secondRun.enrollmentsInserted, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM users WHERE username = 'corsfaculty2'").get().count, 0);
  const replacementFacultyId = db.prepare("SELECT id FROM users WHERE username = 'asha.verma'").get().id;
  assert.deepEqual(
    db.prepare('SELECT faculty_id FROM courses WHERE id IN (?, ?) ORDER BY id').all(...legacyCourseIds).map((course) => course.faculty_id),
    [replacementFacultyId, replacementFacultyId],
  );
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM enrollments WHERE course_id IN (?, ?) AND status = 'completed'").get(...legacyCourseIds).count, 4);

  const seededFaculty = db.prepare(`
    SELECT u.id, u.username, u.age, u.password_hash, r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.username IN (${demoFaculty.map(() => '?').join(', ')})
  `).all(...demoFaculty.map((faculty) => faculty.username));
  assert.equal(seededFaculty.length, 12);
  assert.ok(seededFaculty.every((faculty) => faculty.role === 'faculty' && faculty.age > 0));
  for (const faculty of seededFaculty) {
    assert.equal(await bcrypt.compare('1234', faculty.password_hash), true, faculty.username);
  }

  const facultyOptions = await request(app).get('/auth/faculty-users');
  assert.equal(facultyOptions.status, 200);
  assert.ok(facultyOptions.body.users.length >= 12);
  assert.ok(facultyOptions.body.users.every((faculty) => faculty.first_name && faculty.email));
  assert.ok(demoFaculty.every((seeded) => facultyOptions.body.users.some((faculty) => faculty.username === seeded.username)));

  const underAssignedFaculty = db.prepare(`
    SELECT u.username
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN courses c ON c.faculty_id = u.id
    WHERE r.name = 'faculty'
    GROUP BY u.id
    HAVING COUNT(c.id) < 2
  `).all();
  assert.deepEqual(underAssignedFaculty, []);

  const firstCourseFor = (username) => db.prepare(`
    SELECT c.id, u.username
    FROM courses c
    JOIN users u ON u.id = c.faculty_id
    WHERE u.username = ?
    ORDER BY c.id
  `).get(username);
  const ownCourse = firstCourseFor('anuj.kapoor');
  const otherCourse = firstCourseFor('divya.menon');
  assert.equal(ownCourse.username, 'anuj.kapoor');
  assert.equal(otherCourse.username, 'divya.menon');

  const login = await request(app)
    .post('/auth/login')
    .send({ username: 'anuj.kapoor', password: '1234' });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, 'faculty');

  const ownRoster = await request(app)
    .get(`/courses/${ownCourse.id}/students`)
    .set('Authorization', `Bearer ${login.body.token}`);
  assert.equal(ownRoster.status, 200);
  assert.ok(ownRoster.body.students.length > 0);

  const foreignRoster = await request(app)
    .get(`/courses/${otherCourse.id}/students`)
    .set('Authorization', `Bearer ${login.body.token}`);
  assert.equal(foreignRoster.status, 403);
});

test('Explicit course content population is idempotent and fills each planned course', async () => {
  const db = getDatabase();
  await fs.rm(courseUploadDirectory, { recursive: true, force: true });

  try {
    const firstRun = await seedCourseContent();
    const secondRun = await seedCourseContent();
    const planMatchedCourseCount = db.prepare('SELECT code, title FROM courses').all()
      .filter((course) => courseContentPlan[course.code]
        || (String(course.code).startsWith('FAC') && /^Applied Computing Studio [12]$/.test(course.title))).length;

    assert.equal(firstRun.coursesProcessed, planMatchedCourseCount);
    assert.ok(firstRun.lessonsInserted > 0);
    assert.ok(firstRun.materialsInserted > 0);
    assert.ok(firstRun.assignmentsInserted > 0);
    assert.equal(secondRun.lessonsInserted, 0);
    assert.equal(secondRun.lessonsUpdated, 0);
    assert.equal(secondRun.materialsInserted, 0);
    assert.equal(secondRun.assignmentsInserted, 0);

    const plannedCourses = db.prepare('SELECT id, code FROM courses').all()
      .filter((course) => courseContentPlan[course.code]);
    for (const course of plannedCourses) {
      const count = db.prepare(`
        SELECT COUNT(*) AS count
        FROM lessons l JOIN modules m ON m.id = l.module_id
        WHERE m.course_id = ?
      `).get(course.id).count;
      assert.ok(count >= 3, `${course.code} lesson count was ${count}`);
      assert.ok(db.prepare('SELECT 1 FROM materials WHERE course_id = ?').get(course.id), `${course.code} missing field guide`);
      assert.ok(db.prepare('SELECT 1 FROM assignments WHERE course_id = ? AND status = ?').get(course.id, 'published'), `${course.code} missing practice assignment`);
    }

    const videoUrls = db.prepare(`
      SELECT l.content
      FROM lessons l JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE c.code IN ('CLOUD101', 'DSA201') AND l.content LIKE 'CLOUDLMS_LESSON_V1:%'
    `).all().map(({ content }) => JSON.parse(content.slice('CLOUDLMS_LESSON_V1:'.length)).youtubeUrl).filter(Boolean);
    const verifiedVideos = new Set([
      'https://www.youtube.com/watch?v=dJMFzuXjLas',
      'https://www.youtube.com/watch?v=SGDS6NFN-_U',
      'https://www.youtube.com/watch?v=AT14lCXuMKI',
      'https://www.youtube.com/watch?v=Bnjbun-hiBk',
    ]);
    assert.ok(videoUrls.length > 0);
    assert.ok(videoUrls.every((url) => verifiedVideos.has(url)));
  } finally {
    await fs.rm(courseUploadDirectory, { recursive: true, force: true });
  }
});
