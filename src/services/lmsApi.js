const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const TOKEN_KEY = 'cloudlms_token';
const USER_KEY = 'cloudlms_user';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setAuthSession(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSavedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

export const api = {
  baseUrl: API_BASE_URL,
  getToken,
  setAuthSession,
  clearAuthSession,
  getSavedUser,

  login: async (username, password) => {
    const response = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.token) {
      setAuthSession(response.token, response.user);
    }

    return response;
  },

  register: async (userData) => {
    const response = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    const normalizedUser = response?.user || response?.data?.user || null;
    if (normalizedUser) {
      return { ...response, user: normalizedUser };
    }

    return response;
  },

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      clearAuthSession();
    }
  },

  getMe: async () => {
    const response = await request('/auth/me');
    return response.user;
  },

  getFacultyLoginOptions: async () => {
    const response = await request('/auth/faculty-users');
    return response.users || [];
  },

  getCourses: async () => {
    const response = await request('/courses');
    return response.courses || [];
  },

  getCourseById: async (courseId) => {
    const response = await request(`/courses/${courseId}`);
    return response.course;
  },

  getMyCourses: async () => {
    const response = await request('/courses/me/courses');
    return response.courses || [];
  },

  enrollInCourse: async (courseId) => {
    return request(`/courses/${courseId}/enroll`, { method: 'POST' });
  },

  getCourseModules: async (courseId) => {
    const response = await request(`/courses/${courseId}/modules`);
    return response.modules || [];
  },

  getCourseMaterials: async (courseId) => {
    const response = await request(`/courses/${courseId}/materials`);
    return response.materials || [];
  },

  getCourseStudents: async (courseId) => {
    const response = await request(`/courses/${courseId}/students`);
    return response.students || [];
  },

  getAnnouncements: async () => {
    const response = await request('/announcements/my');
    return response.announcements || [];
  },
  createAnnouncement: async (courseId, payload) => {
    const response = await request(`/courses/${courseId}/announcements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.announcement;
  },

  getAdminStudents: async () => {
    const response = await request('/admin/students');
    return response.users || [];
  },

  getAdminFaculty: async () => {
    const response = await request('/admin/faculty');
    return response.users || [];
  },

  getModuleLessons: async (moduleId) => {
    const response = await request(`/modules/${moduleId}/lessons`);
    return response.lessons || [];
  },

  getLessonById: async (lessonId) => {
    const response = await request(`/lessons/${lessonId}`);
    return response.lesson;
  },

  completeLesson: async (lessonId) => {
    return request(`/lessons/${lessonId}/complete`, { method: 'POST' });
  },

  getCourseAssignments: async (courseId) => {
    const response = await request(`/courses/${courseId}/assignments`);
    return response.assignments || [];
  },

  getCourseQuizzes: async (courseId) => {
    const response = await request(`/courses/${courseId}/quizzes`);
    return response.quizzes || [];
  },

  createQuiz: async (courseId, payload) => {
    const response = await request(`/courses/${courseId}/quizzes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.quiz;
  },

  getQuiz: async (quizId) => {
    const response = await request(`/quizzes/${quizId}`);
    return response.quiz;
  },

  getQuizAttempts: async (quizId) => {
    const response = await request(`/quizzes/${quizId}/attempts`);
    return response.attempts || [];
  },

  submitQuizAttempt: async (quizId, payload) => {
    const response = await request(`/quizzes/${quizId}/attempts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.attempt;
  },

  getAssignment: async (assignmentId) => {
    const response = await request(`/assignments/${assignmentId}`);
    return response.assignment;
  },

  createAssignment: async (courseId, payload) => {
    const response = await request(`/courses/${courseId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.assignment;
  },

  deleteAssignment: async (assignmentId) => {
    return request(`/assignments/${assignmentId}`, { method: 'DELETE' });
  },

  submitAssignment: async (assignmentId, payload) => {
    const response = await request(`/assignments/${assignmentId}/submissions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.submission;
  },

  getMySubmission: async (assignmentId) => {
    const response = await request(`/assignments/${assignmentId}/my-submission`);
    return response.submission || null;
  },

  getAssignmentSubmissions: async (assignmentId) => {
    const response = await request(`/assignments/${assignmentId}/submissions`);
    return response.submissions || [];
  },

  evaluateSubmission: async (submissionId, payload) => {
    const response = await request(`/submissions/${submissionId}/evaluate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.submission;
  },

  getCourseProgress: async (courseId) => {
    const response = await request(`/courses/${courseId}/progress`);
    return response.details || { percent: response.progress ?? 0 };
  },

  createCourse: async (payload) => {
    const response = await request('/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.course;
  },

  createCourseModule: async (courseId, payload) => {
    const response = await request(`/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.module;
  },

  createCourseMaterial: async (courseId, payload) => {
    let body = JSON.stringify(payload);
    if (payload.file) {
      const form = new FormData();
      form.append('title', payload.title);
      form.append('fileType', payload.fileType || 'document');
      form.append('file', payload.file);
      if (payload.fileUrl) form.append('fileUrl', payload.fileUrl);
      body = form;
    }
    const response = await request(`/courses/${courseId}/materials`, {
      method: 'POST',
      body,
    });

    return response.material;
  },

  downloadCourseMaterial: async (materialId) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/materials/${materialId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Unable to download this material.');
    }
    return response.blob();
  },

  createLesson: async (moduleId, payload) => {
    const response = await request(`/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.lesson;
  },

  updateLesson: async (lessonId, payload) => {
    const response = await request(`/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.lesson;
  },

  deleteLesson: async (lessonId) => {
    return request(`/lessons/${lessonId}`, { method: 'DELETE' });
  },
};
