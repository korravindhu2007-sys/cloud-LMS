import { createCourse, getAllCourses, getCourseById, updateCourse, deleteCourse, enrollStudentInCourse, getUserCourses, isUserEnrolledInCourse } from '../models/courseModel.js';
import { getUserById } from '../models/userModel.js';

export function listCourses() {
  return getAllCourses();
}

export function fetchCourseById(courseId) {
  return getCourseById(courseId);
}

export function createCourseService(input, facultyId) {
  const targetFacultyId = input.facultyId && Number(input.facultyId) > 0 ? Number(input.facultyId) : Number(facultyId);

  const course = createCourse({
    title: input.title,
    description: input.description,
    code: input.code,
    credits: input.credits,
    status: input.status || 'published',
    facultyId: targetFacultyId,
  });

  return course;
}

export function updateCourseService(courseId, updateInfo) {
  return updateCourse(courseId, updateInfo);
}

export function deleteCourseService(courseId) {
  return deleteCourse(courseId);
}

export function enrollStudentService(userId, courseId) {
  const user = getUserById(userId);
  if (!user) {
    throw Object.assign(new Error('User does not exist.'), { statusCode: 404 });
  }

  const course = getCourseById(courseId);
  if (!course) {
    throw Object.assign(new Error('Course not found.'), { statusCode: 404 });
  }

  if (user.role_name === 'faculty') {
    throw Object.assign(new Error('Faculty members cannot enroll as students.'), { statusCode: 400 });
  }

  const result = enrollStudentInCourse(userId, courseId);
  return result;
}

export function getStudentCourses(userId) {
  return getUserCourses(userId);
}

export function authorizeCourseAccess(user, courseId) {
  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'faculty') {
    const course = getCourseById(courseId);
    return course && Number(course.faculty_id) === Number(user.id);
  }

  return isUserEnrolledInCourse(user.id, courseId);
}
