import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { api } from './services/lmsApi';

const getFullName = (user) => `${user?.first_name || user?.firstName || ''} ${user?.last_name || user?.lastName || ''}`.trim() || user?.username || 'User';
const LESSON_CONTENT_PREFIX = 'CLOUDLMS_LESSON_V1:';

function parseLessonContent(content) {
  const value = String(content || '');
  if (!value.startsWith(LESSON_CONTENT_PREFIX)) {
    return { description: value, youtubeUrl: '' };
  }

  try {
    const parsed = JSON.parse(value.slice(LESSON_CONTENT_PREFIX.length));
    return {
      description: String(parsed.description || ''),
      youtubeUrl: String(parsed.youtubeUrl || ''),
    };
  } catch {
    return { description: value, youtubeUrl: '' };
  }
}

function serializeLessonContent(description, youtubeUrl) {
  return `${LESSON_CONTENT_PREFIX}${JSON.stringify({ description, youtubeUrl })}`;
}

function isYouTubeUrl(value) {
  try {
    const parsed = new URL(value);
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(parsed.hostname.toLowerCase())
      && ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

const roleMeta = {
  student: {
    label: 'Student',
    overview: 'Academic workspace',
    nav: ['Profile', 'My Courses', 'Assignments', 'Logout'],
  },
  faculty: {
    label: 'Faculty',
    overview: 'Teaching workspace',
    nav: ['Profile', 'Students', 'My Courses', 'Announcements', 'Logout'],
  },
  admin: {
    label: 'Admin',
    overview: 'System operations',
    nav: ['Profile', 'Courses', 'Logout'],
  },
};

const roleLandingPages = {
  student: 'My Courses',
  faculty: 'Profile',
  admin: 'Courses',
};

function getAuthenticatedRole(user) {
  return user?.role && roleMeta[user.role] ? user.role : null;
}

function FormatProgress({ value }) {
  const safeValue = Number(value) || 0;
  return (
    <div className="progress-block" aria-label={`Progress ${safeValue}%`}>
      <div className="progress-label">
        <span>Progress</span>
        <strong>{safeValue}%</strong>
      </div>
      <div className="progress-track">
        <span className="progress-bar" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function CourseList({ courses, onOpenCourse }) {
  return (
    <div className="course-grid">
      {courses.map((course) => (
        <article className="course-card" key={course.id || course.title}>
          <div className={`course-accent accent-${course.accent || 'blue'}`} />
          <div className="course-head">
            <div>
              <p className="eyebrow">Course</p>
              <h3>{course.title}</h3>
            </div>
            <button className="ghost-button" type="button" onClick={() => onOpenCourse(course.id)}>
              Open
            </button>
          </div>
          <p className="course-instructor">{course.instructor || course.username || 'Faculty'}</p>
          <FormatProgress value={course.progress} />
          <div className="course-meta">
            <span>{course.lessons || 0} lessons</span>
            <span>{course.next || course.description || 'Progress live'}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function AssignmentList({ assignments, selectedId, onOpen, emptyText }) {
  if (!assignments || !assignments.length) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <div className="assignment-list">
      {assignments.map((assignment) => (
        <button
          key={assignment.id}
          type="button"
          className={selectedId === assignment.id ? 'assignment-card selected' : 'assignment-card'}
          onClick={() => onOpen(assignment.id)}
        >
          <div className="assignment-card-header">
            <div>
              <p className="eyebrow">Assignment</p>
              <h3>{assignment.title}</h3>
            </div>
            <span className={assignment.status === 'draft' ? 'status-tag pending' : 'status-tag on-track'}>
              {assignment.status === 'draft' ? 'Draft' : `${assignment.max_score || assignment.maxScore || 100} pts`}
            </span>
          </div>
          <p className="assignment-copy">{assignment.description || 'No description provided.'}</p>
          <div className="assignment-meta">
            <span>Due {assignment.due_date || assignment.dueDate || 'Not set'}</span>
            <span>{assignment.max_score || assignment.maxScore || 100} max</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function ModulePage({ title, rows, highlight, emptyMessage }) {
  return (
    <div className="page-shell">
      <section className="panel page-header-panel">
        <div>
          <p className="eyebrow">Academic workspace</p>
          <h2>{title}</h2>
        </div>
        <span className="page-pill">{highlight}</span>
      </section>

      <section className="panel panel-list table-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Records</p>
            <h2>{rows.length ? 'Current entries' : 'No data available'}</h2>
          </div>
        </div>

        {rows.length ? (
          <div className="data-table">
            <div className="table-header">
              <span>Name</span>
              <span>Course</span>
              <span>Due</span>
              <span>Status</span>
              <span>Score</span>
            </div>
            {rows.map((row) => (
              <div className="table-row-flex" key={`${row.name}-${row.due || row.course}`}>
                <span>{row.name}</span>
                <span>{row.course || 'Course work'}</span>
                <span>{row.due || '—'}</span>
                <span className={`status-tag ${String(row.status || 'on-track').toLowerCase().replace(/\s+/g, '-')}`}>{row.status || 'On track'}</span>
                <span>{row.score || '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">{emptyMessage || 'No data is available for this section yet.'}</div>
        )}
      </section>
    </div>
  );
}

function AuthGate({
  activeRole,
  setActiveRole,
  username,
  setUsername,
  password,
  setPassword,
  facultyLoginOptions,
  authView,
  setAuthView,
  registrationData = {
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  },
  setRegistrationData,
  onLogin,
  onRegister,
  isSubmitting,
  errorMessage,
  roleMenuOpen,
  setRoleMenuOpen,
}) {
  const roleLabel = activeRole === 'student' ? 'Student' : activeRole === 'faculty' ? 'Faculty' : 'Admin';
  const currentFacultyUsername = activeRole === 'faculty' && facultyLoginOptions.length ? (username || facultyLoginOptions[0].username) : username;
  const handleRoleSelect = (nextRole) => {
    setActiveRole(nextRole);
    if (nextRole === 'student') {
      setUsername('student1');
      setPassword('StudentPass123!');
    } else if (nextRole === 'faculty') {
      setUsername(facultyLoginOptions[0]?.username || '');
      setPassword('1234');
    } else {
      setUsername('Admin');
      setPassword('admin@123');
    }
    setAuthView('login');
    setRoleMenuOpen(false);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-block auth-brand">
            <div className="brand-mark">CL</div>
            <div>
              <strong>CloudLMS</strong>
              <span>Learning management system</span>
            </div>
          </div>

          <div className="auth-role-dropdown-wrap">
            <button
              type="button"
              className="auth-role-select-button"
              aria-label="Select authentication role"
              onClick={() => setRoleMenuOpen((current) => !current)}
            >
              <span>{roleMeta[activeRole]?.label || 'Student'}</span>
              <span className="role-caret">▾</span>
            </button>
            {roleMenuOpen && (
              <div className="auth-role-menu" role="menu">
                {Object.keys(roleMeta).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={key === activeRole ? 'auth-role-menu-item active' : 'auth-role-menu-item'}
                    onClick={() => handleRoleSelect(key)}
                  >
                    {roleMeta[key].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="auth-copy">
          <p className="eyebrow">University portal</p>
          <h1>Cloud Based Learning Management System</h1>
          <p>Secure access for academic delivery, course learning, assessments, and institutional reporting.</p>
        </div>

        {authView === 'login' ? (
          <>
            <div className="auth-form">
              <h2>{roleLabel} Login</h2>
              {activeRole === 'faculty' ? (
                facultyLoginOptions.length > 0 ? (
                  <label>
                    Faculty account
                    <select value={currentFacultyUsername} onChange={(event) => setUsername(event.target.value)}>
                      {facultyLoginOptions.map((faculty) => (
                        <option key={faculty.id} value={faculty.username}>
                          {`${faculty.first_name || ''} ${faculty.last_name || ''}`.trim() || faculty.username} ({faculty.email})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : <p className="empty-state">Loading faculty accounts…</p>
              ) : (
                <label>
                  Username / Email
                  <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username or email" />
                </label>
              )}
              <label>
                Password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
              </label>
            </div>

            {errorMessage && <div className="form-error">{errorMessage}</div>}
            <button type="button" className="primary-button full-width" onClick={onLogin} disabled={isSubmitting || (activeRole === 'faculty' && facultyLoginOptions.length === 0)}>
              {isSubmitting ? 'Signing in…' : 'Login'}
            </button>

            {activeRole === 'student' && (
              <p className="auth-switch-text">
                Don&apos;t have an account?{' '}
                <button type="button" className="text-link" onClick={() => setAuthView('register')}>
                  Register
                </button>
              </p>
            )}
          </>
        ) : (
          <>
            <div className="auth-form">
              <h2>{roleLabel} Registration</h2>
              <div className="inline-two-col">
                <label>
                  First name
                  <input type="text" value={registrationData.firstName} onChange={(event) => setRegistrationData((current) => ({ ...current, firstName: event.target.value }))} placeholder="First name" />
                </label>
                <label>
                  Last name
                  <input type="text" value={registrationData.lastName} onChange={(event) => setRegistrationData((current) => ({ ...current, lastName: event.target.value }))} placeholder="Last name" />
                </label>
              </div>
              <label>
                Email
                <input type="email" value={registrationData.email} onChange={(event) => setRegistrationData((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" />
              </label>
              <label>
                Username
                <input type="text" value={registrationData.username} onChange={(event) => setRegistrationData((current) => ({ ...current, username: event.target.value }))} placeholder="Choose a username" />
              </label>
              <label>
                Password
                <input type="password" value={registrationData.password} onChange={(event) => setRegistrationData((current) => ({ ...current, password: event.target.value }))} placeholder="Create a password" />
              </label>
              <label>
                Confirm password
                <input type="password" value={registrationData.confirmPassword} onChange={(event) => setRegistrationData((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder="Confirm your password" />
              </label>
            </div>

            {errorMessage && <div className="form-error">{errorMessage}</div>}
            <button type="button" className="primary-button full-width" onClick={onRegister} disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Register'}
            </button>

            <p className="auth-switch-text">
              Already have an account?{' '}
              <button type="button" className="text-link" onClick={() => setAuthView('login')}>
                Login
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [activeRole, setActiveRole] = useState('student');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [authLoading, setAuthLoading] = useState(true);
  const [activePage, setActivePage] = useState('Profile');
  const [expandedFacultyId, setExpandedFacultyId] = useState(null);
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [facultyDetailMap, setFacultyDetailMap] = useState({});
  const [adminStudentDetailMap, setAdminStudentDetailMap] = useState({});
  const [studentDetailLoadingId, setStudentDetailLoadingId] = useState(null);
  const [courseEnrollmentMap, setCourseEnrollmentMap] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('student1');
  const [password, setPassword] = useState('StudentPass123!');
  const [registrationData, setRegistrationData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseModules, setCourseModules] = useState([]);
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [courseQuizzes, setCourseQuizzes] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [assignmentDetail, setAssignmentDetail] = useState(null);
  const [quizDraft, setQuizDraft] = useState({
    title: '',
    description: '',
    dueDate: '',
    questions: [{
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'A',
      points: 1,
    }],
  });
  const [quizAttemptAnswers, setQuizAttemptAnswers] = useState({});
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [myAssignmentSubmission, setMyAssignmentSubmission] = useState(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonEditDraft, setLessonEditDraft] = useState({ title: '', description: '', youtubeUrl: '' });
  const [assignmentDraft, setAssignmentDraft] = useState({ title: '', description: '', dueDate: '', maxScore: '100', resourceUrl: '', status: 'published' });
  const [assignmentSubmissionText, setAssignmentSubmissionText] = useState('');
  const [assignmentSubmissionFileUrl, setAssignmentSubmissionFileUrl] = useState('');
  const [submissionScore, setSubmissionScore] = useState('');
  const [submissionFeedback, setSubmissionFeedback] = useState('');
  const [courseMaterials, setCourseMaterials] = useState([]);
  const [materialDraft, setMaterialDraft] = useState({ title: '', fileUrl: '', fileType: 'document', file: null });
  const [lessonDraft, setLessonDraft] = useState({ title: '', description: '', youtubeUrl: '' });
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [studentAnnouncements, setStudentAnnouncements] = useState([]);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [announcementActionLoading, setAnnouncementActionLoading] = useState(false);
  const [facultyAnnouncementDraft, setFacultyAnnouncementDraft] = useState({ title: '', content: '', courseId: '' });
  const [facultyRoster, setFacultyRoster] = useState([]);
  const [facultyLoginOptions, setFacultyLoginOptions] = useState([]);
  const [adminStudents, setAdminStudents] = useState([]);
  const [adminFaculty, setAdminFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadFacultyLoginOptions = async () => {
      try {
        const options = await api.getFacultyLoginOptions();
        setFacultyLoginOptions(options);
      } catch {
        setFacultyLoginOptions([]);
      }
    };

    loadFacultyLoginOptions();
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const token = api.getToken();

      if (!token) {
        api.clearAuthSession();
        setAuthLoading(false);
        return;
      }

      try {
        const user = await api.getMe();
        const authenticatedRole = getAuthenticatedRole(user);
        if (!authenticatedRole) {
          throw new Error('The account does not have a supported role.');
        }

        setAuthUser(user);
        setActiveRole(authenticatedRole);
        setActivePage(roleLandingPages[authenticatedRole]);
        setIsAuthenticated(true);
      } catch {
        api.clearAuthSession();
        setIsAuthenticated(false);
        setAuthUser(null);
      }

      setAuthLoading(false);
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const loadCatalog = async () => {
      try {
        setLoading(true);
        const response = await api.getCourses();
        setCourses(response);
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load courses.');
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadStudentCourses = async () => {
      if (authUser?.role !== 'student') return;
      try {
        const response = await api.getMyCourses();
        setMyCourses(response);
      } catch {
        setMyCourses([]);
      }
    };

    const loadAnnouncements = async () => {
      try {
        const response = await api.getAnnouncements();
        setStudentAnnouncements(response || []);
      } catch {
        setStudentAnnouncements([]);
      }
    };

    loadStudentCourses();
    loadAnnouncements();
  }, [isAuthenticated, authUser?.role]);

  useEffect(() => {
    if (!isAuthenticated || authUser?.role !== 'student' || !myCourses.length) return;

    const loadStudentAssignments = async () => {
      const results = await Promise.all(
        myCourses.map(async (course) => {
          const assignments = await api.getCourseAssignments(course.id).catch(() => []);
          return assignments.map((assignment) => ({ ...assignment, courseTitle: course.title }));
        }),
      );
      setStudentAssignments(results.flat());
    };

    loadStudentAssignments();
  }, [isAuthenticated, authUser?.role, myCourses]);

  useEffect(() => {
    if (!isAuthenticated || authUser?.role !== 'faculty') {
      return;
    }

    const loadFacultyRoster = async () => {
      try {
        const ownedCourses = courses.filter((course) => String(course.faculty_id) === String(authUser.id));
        const rosterCollections = await Promise.all(
          ownedCourses.map(async (course) => {
            const students = await api.getCourseStudents(course.id).catch(() => []);
            return students.map((student) => ({
              ...student,
              courseId: course.id,
              course: course.title,
              completion: Number(student.progress || 0),
            }));
          }),
        );
        setFacultyRoster(rosterCollections.flat());
      } catch {
        setFacultyRoster([]);
      }
    };

    loadFacultyRoster();
  }, [isAuthenticated, authUser?.id, authUser?.role, courses]);

  useEffect(() => {
    if (!isAuthenticated || authUser?.role !== 'admin') {
      return;
    }

    const loadAdminUsers = async () => {
      try {
        const [students, faculty] = await Promise.all([
          api.getAdminStudents().catch(() => []),
          api.getAdminFaculty().catch(() => []),
        ]);
        setAdminStudents(students);
        setAdminFaculty(faculty);
      } catch {
        setAdminStudents([]);
        setAdminFaculty([]);
      }
    };

    loadAdminUsers();
  }, [isAuthenticated, authUser?.role]);

  const effectiveRole = isAuthenticated ? getAuthenticatedRole(authUser) : activeRole;
  const currentRole = roleMeta[effectiveRole] || roleMeta.student;
  const adminFacultyCount = adminFaculty.length;
  const adminStudentCount = adminStudents.length;

  const toggleFacultyExpansion = async (facultyId) => {
    const nextValue = expandedFacultyId === facultyId ? null : facultyId;
    setExpandedFacultyId(nextValue);

    if (!nextValue) {
      return;
    }

    const facultyCourses = courses.filter((course) => String(course.faculty_id) === String(facultyId));
    if (!facultyCourses.length) {
      setFacultyDetailMap((current) => ({ ...current, [facultyId]: [] }));
      return;
    }

    const resolvedCourses = await Promise.all(
      facultyCourses.map(async (course) => {
        const materials = await api.getCourseMaterials(course.id).catch(() => []);
        return { ...course, materials };
      }),
    );

    setFacultyDetailMap((current) => ({ ...current, [facultyId]: resolvedCourses }));
  };

  const toggleStudentExpansion = async (student) => {
    const nextStudentId = expandedStudentId === student.id ? null : student.id;
    setExpandedStudentId(nextStudentId);
    if (!nextStudentId || adminStudentDetailMap[student.id]) return;

    setStudentDetailLoadingId(student.id);
    try {
      const allCourses = courses.length ? courses : await api.getCourses();
      const courseRosters = await Promise.all(
        allCourses.map(async (course) => ({
          course,
          students: await api.getCourseStudents(course.id).catch(() => []),
        })),
      );
      const enrolledCourses = courseRosters
        .map(({ course, students }) => ({
          ...course,
          enrollment: students.find((entry) => String(entry.id) === String(student.id)) || null,
        }))
        .filter((course) => course.enrollment);

      const courseDetails = await Promise.all(enrolledCourses.map(async (course) => {
        const [assignments, quizzes] = await Promise.all([
          api.getCourseAssignments(course.id).catch(() => []),
          api.getCourseQuizzes(course.id).catch(() => []),
        ]);
        const [assignmentResults, quizResults] = await Promise.all([
          Promise.all(assignments.map(async (assignment) => {
            const submissions = await api.getAssignmentSubmissions(assignment.id).catch(() => []);
            return {
              ...assignment,
              submission: submissions.find((submission) => String(submission.user_id) === String(student.id)) || null,
            };
          })),
          Promise.all(quizzes.map(async (quiz) => {
            const attempts = await api.getQuizAttempts(quiz.id).catch(() => []);
            return {
              ...quiz,
              attempts: attempts.filter((attempt) => String(attempt.user_id) === String(student.id)),
            };
          })),
        ]);

        return { ...course, assignments: assignmentResults, quizzes: quizResults };
      }));

      setAdminStudentDetailMap((current) => ({
        ...current,
        [student.id]: { courses: courseDetails },
      }));
    } catch {
      setAdminStudentDetailMap((current) => ({ ...current, [student.id]: { courses: [] } }));
    } finally {
      setStudentDetailLoadingId(null);
    }
  };

  const toggleCourseExpansion = async (courseId) => {
    const nextValue = expandedCourseId === courseId ? null : courseId;
    setExpandedCourseId(nextValue);

    if (!nextValue) {
      return;
    }

    const enrolled = await api.getCourseStudents(courseId).catch(() => []);
    setCourseEnrollmentMap((current) => ({ ...current, [courseId]: enrolled.length }));
  };

  const studentCourseCards = useMemo(() => {
    const source = myCourses.length ? myCourses : courses;
    return source.map((course, index) => ({
      id: course.id,
      title: course.title,
      instructor: course.username ? `Faculty: ${course.username}` : 'Faculty',
      progress: Number(course.progress || 0),
      lessons: Number(course.totalLessons || course.lessons || 0),
      next: course.description || 'Continue learning',
      accent: ['blue', 'green', 'purple'][index % 3],
    }));
  }, [courses, myCourses]);

  const availableCourseCards = useMemo(() => {
    const enrolledCourseIds = new Set(myCourses.map((course) => String(course.id)));
    return courses
      .filter((course) => !enrolledCourseIds.has(String(course.id)))
      .map((course, index) => ({
        id: course.id,
        title: course.title,
        instructor: course.username ? `Faculty: ${course.username}` : 'Faculty',
        progress: 0,
        lessons: Number(course.totalLessons || course.lessons || 0),
        next: course.description || 'View course details',
        accent: ['blue', 'green', 'purple'][index % 3],
      }));
  }, [courses, myCourses]);

  const adminCourseCards = useMemo(() => (
    courses.map((course, index) => ({
      id: course.id,
      title: course.title,
      instructor: course.username ? `Faculty: ${course.username}` : 'Faculty',
      progress: 0,
      lessons: Number(course.totalLessons || course.lessons || 0),
      next: course.description || 'Course details available',
      accent: ['blue', 'green', 'purple'][index % 3],
    }))
  ), [courses]);

  const facultyCourseCards = useMemo(() => {
    return courses
      .filter((course) => String(course.faculty_id) === String(authUser?.id))
      .map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        progress: 0,
        enrollmentCount: facultyRoster.filter((student) => String(student.courseId) === String(course.id)).length,
      }));
  }, [courses, authUser?.id, facultyRoster]);

  const refreshCourseAssignments = async (courseId) => {
    if (!courseId) {
      setCourseAssignments([]);
      return [];
    }

    try {
      const nextAssignments = await api.getCourseAssignments(courseId);
      setCourseAssignments(nextAssignments);
      return nextAssignments;
    } catch {
      setCourseAssignments([]);
      return [];
    }
  };

  const refreshCourseQuizzes = async (courseId) => {
    if (!courseId) {
      setCourseQuizzes([]);
      return [];
    }

    try {
      const nextQuizzes = await api.getCourseQuizzes(courseId);
      setCourseQuizzes(nextQuizzes);
      return nextQuizzes;
    } catch {
      setCourseQuizzes([]);
      return [];
    }
  };

  const openAssignment = async (assignmentId) => {
    if (!assignmentId) {
      return;
    }

    try {
      setLoading(true);
      const assignment = await api.getAssignment(assignmentId);
      setSelectedAssignmentId(assignmentId);
      setAssignmentDetail(assignment);

      if (effectiveRole === 'student') {
        const submission = await api.getMySubmission(assignmentId).catch(() => null);
        setMyAssignmentSubmission(submission);
        setAssignmentSubmissions([]);
      }

      if (effectiveRole === 'faculty' || effectiveRole === 'admin') {
        const submissions = await api.getAssignmentSubmissions(assignmentId).catch(() => []);
        setAssignmentSubmissions(submissions);
        setSelectedSubmissionId(submissions[0]?.id || null);
        setSubmissionScore(submissions[0]?.score ? String(submissions[0].score) : '');
        setSubmissionFeedback(submissions[0]?.feedback || '');
        setMyAssignmentSubmission(null);
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load assignment details.');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseDetails = async (courseId) => {
    if (!courseId) {
      setSelectedCourse(null);
      setCourseAssignments([]);
      setCourseMaterials([]);
      setSelectedAssignmentId(null);
      setAssignmentDetail(null);
      setAssignmentSubmissions([]);
      setMyAssignmentSubmission(null);
      setSelectedSubmissionId(null);
      setAssignmentSubmissionText('');
      setAssignmentSubmissionFileUrl('');
      return;
    }

    setSelectedAssignmentId(null);
    setAssignmentDetail(null);
    setAssignmentSubmissions([]);
    setMyAssignmentSubmission(null);
    setSelectedSubmissionId(null);
    setAssignmentSubmissionText('');
    setAssignmentSubmissionFileUrl('');
    try {
      setLoading(true);
      const course = await api.getCourseById(courseId);
      const hasContentAccess = course.hasContentAccess || effectiveRole !== 'student';
      const [modules, assignments, materials, quizzes] = hasContentAccess
        ? await Promise.all([
          api.getCourseModules(courseId),
          api.getCourseAssignments(courseId),
          api.getCourseMaterials(courseId).catch(() => []),
          api.getCourseQuizzes(courseId).catch(() => []),
        ])
        : [[], [], [], []];

      setSelectedCourse(course);
      setCourseModules(modules);
      setCourseAssignments(assignments);
      setCourseMaterials(materials);
      setCourseQuizzes(quizzes);
      setSelectedCourseId(courseId);

      if (modules.length) {
        const firstModule = modules[0];
        setSelectedModuleId(firstModule.id);
        setSelectedLessonId(firstModule.lessons?.[0]?.id || null);
      } else {
        setSelectedModuleId(null);
        setSelectedLessonId(null);
      }
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load this course.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsSubmitting(true);
    setLoginError('');

    try {
      const selectedUsername = activeRole === 'faculty' && !facultyLoginOptions.some((faculty) => faculty.username === username)
        ? facultyLoginOptions[0]?.username
        : username;
      if (!selectedUsername) {
        throw new Error('Select a faculty account before signing in.');
      }
      const response = await api.login(selectedUsername, password);
      const authenticatedRole = getAuthenticatedRole(response.user);
      if (!authenticatedRole) {
        throw new Error('The account does not have a supported role.');
      }

      setAuthUser(response.user);
      setActiveRole(authenticatedRole);
      setIsAuthenticated(true);
      setAuthView('login');
      setActivePage(roleLandingPages[authenticatedRole]);
    } catch (error) {
      setLoginError(error.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    const nextRole = 'student';
    const { firstName, lastName, email, username: registrationUsername, password: registrationPassword, confirmPassword } = registrationData;

    if (!firstName || !lastName || !email || !registrationUsername || !registrationPassword || !confirmPassword) {
      setLoginError('Please complete all registration fields.');
      return;
    }

    if (registrationPassword !== confirmPassword) {
      setLoginError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLoginError('');
      await api.register({
        firstName,
        lastName,
        email,
        username: registrationUsername,
        password: registrationPassword,
        role: nextRole,
      });

      setRegistrationData({ firstName: '', lastName: '', email: '', username: '', password: '', confirmPassword: '' });
      setUsername(registrationUsername);
      setPassword(registrationPassword);
      setAuthView('login');
      setLoginError('');
    } catch (error) {
      setLoginError(error.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore backend logout errors and clear frontend state.
    } finally {
      setIsAuthenticated(false);
      setAuthUser(null);
      setSelectedCourse(null);
      setSelectedCourseId(null);
      setCourseModules([]);
      setCourseAssignments([]);
      setCourseMaterials([]);
      setStudentAssignments([]);
      setMyCourses([]);
      setStudentAnnouncements([]);
      setSelectedAssignmentId(null);
      setAssignmentDetail(null);
      setAssignmentSubmissions([]);
      setMyAssignmentSubmission(null);
      setSelectedSubmissionId(null);
      setAssignmentSubmissionText('');
      setAssignmentSubmissionFileUrl('');
      setSubmissionScore('');
      setSubmissionFeedback('');
      setFacultyRoster([]);
      setAdminStudents([]);
      setAdminFaculty([]);
      setSelectedModuleId(null);
      setSelectedLessonId(null);
      setActivePage('Profile');
      setUsername('student1');
      setPassword('StudentPass123!');
      setErrorMessage('');
      setLoginError('');
    }
  };

  const handleOpenCourse = async (courseId) => {
    if (!courseId) return;
    setSelectedCourseId(courseId);
    setActivePage('Course Detail');
    await loadCourseDetails(courseId);
  };

  const handleEnroll = async (courseId) => {
    try {
      setActionLoading(true);
      await api.enrollInCourse(courseId);
      await loadCourseDetails(courseId);
      const refreshedCourses = await api.getMyCourses();
      setMyCourses(refreshedCourses);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Course enrollment failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteLesson = async (lessonId) => {
    if (!lessonId) return;

    try {
      setActionLoading(true);
      await api.completeLesson(lessonId);
      if (selectedCourseId) {
        await loadCourseDetails(selectedCourseId);
      }
      if (authUser?.role === 'student') {
        const refreshed = await api.getMyCourses();
        setMyCourses(refreshed);
      }
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to mark the lesson complete.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    const nextTitle = window.prompt('Course title');
    if (!nextTitle || !nextTitle.trim()) return;

    try {
      setActionLoading(true);
      const course = await api.createCourse({
        title: nextTitle.trim(),
        description: 'Created from the faculty workspace.',
        code: nextTitle.trim().toUpperCase().replace(/\s+/g, '').slice(0, 8) || 'COURSE',
        credits: 3,
        status: 'published',
      });

      setCourses((current) => [course, ...current]);
      await handleOpenCourse(course.id);
    } catch (error) {
      setErrorMessage(error.message || 'Course creation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedCourseId) {
      return;
    }

    const title = assignmentDraft.title.trim();
    const description = assignmentDraft.description.trim();
    const maxScore = Number(assignmentDraft.maxScore || 100);

    if (!title) {
      setErrorMessage('Assignment title is required.');
      return;
    }

    try {
      setActionLoading(true);
      await api.createAssignment(selectedCourseId, {
        title,
        description,
        dueDate: assignmentDraft.dueDate || null,
        maxScore: Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100,
        resourceUrl: assignmentDraft.resourceUrl.trim(),
        status: assignmentDraft.status,
      });

      setAssignmentDraft({ title: '', description: '', dueDate: '', maxScore: '100', resourceUrl: '', status: 'published' });
      await refreshCourseAssignments(selectedCourseId);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateQuiz = async () => {
    if (!selectedCourseId) return;

    const question = quizDraft.questions[0];
    if (!quizDraft.title.trim() || !question?.questionText?.trim() || !question.optionA.trim() || !question.optionB.trim() || !question.optionC.trim() || !question.optionD.trim()) {
      setErrorMessage('Please complete the quiz title and at least one full question with four answer options.');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        title: quizDraft.title.trim(),
        description: quizDraft.description.trim(),
        dueDate: quizDraft.dueDate || null,
        questions: [{
          questionText: question.questionText.trim(),
          optionA: question.optionA.trim(),
          optionB: question.optionB.trim(),
          optionC: question.optionC.trim(),
          optionD: question.optionD.trim(),
          correctAnswer: question.correctAnswer || 'A',
          points: Number(question.points || 1),
        }],
      };

      await api.createQuiz(selectedCourseId, payload);
      setQuizDraft({
        title: '',
        description: '',
        dueDate: '',
        questions: [{
          questionText: '',
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          correctAnswer: 'A',
          points: 1,
        }],
      });
      await refreshCourseQuizzes(selectedCourseId);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create quiz.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitQuizAttempt = async (quizId) => {
    if (!quizId) return;

    const answers = (quizId && quizAttemptAnswers[quizId]) || [];
    if (!answers.length) {
      setErrorMessage('Select an answer for each question before submitting the quiz.');
      return;
    }

    try {
      setActionLoading(true);
      await api.submitQuizAttempt(quizId, { answers });
      setQuizAttemptAnswers((current) => ({ ...current, [quizId]: [] }));
      setErrorMessage('');
      await refreshCourseQuizzes(selectedCourseId);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to submit the quiz.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignmentId) {
      return;
    }

    const content = assignmentSubmissionText.trim();
    if (!content) {
      setErrorMessage('Assignment submission content is required.');
      return;
    }

    try {
      setActionLoading(true);
      await api.submitAssignment(selectedAssignmentId, { content, fileUrl: assignmentSubmissionFileUrl.trim() || null });
      setAssignmentSubmissionText('');
      setAssignmentSubmissionFileUrl('');
      const refreshedSubmission = await api.getMySubmission(selectedAssignmentId);
      setMyAssignmentSubmission(refreshedSubmission);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to submit the assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEvaluateSubmission = async () => {
    if (!selectedSubmissionId) {
      return;
    }

    const nextScore = Number(submissionScore);
    if (!Number.isFinite(nextScore) || nextScore < 0) {
      setErrorMessage('Marks must be a valid number.');
      return;
    }

    try {
      setActionLoading(true);
      const updated = await api.evaluateSubmission(selectedSubmissionId, {
        score: nextScore,
        feedback: submissionFeedback,
      });

      setAssignmentSubmissions((current) => current.map((submission) => (
        submission.id === selectedSubmissionId ? { ...submission, score: updated.score, feedback: updated.feedback } : submission
      )));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save the evaluation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!assignmentId) {
      return;
    }

    try {
      setActionLoading(true);
      await api.deleteAssignment(assignmentId);
      if (selectedAssignmentId === assignmentId) {
        setSelectedAssignmentId(null);
        setAssignmentDetail(null);
      }
      await refreshCourseAssignments(selectedCourseId);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete the assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateModule = async (title) => {
    if (!selectedCourseId || !title || !title.trim()) return;

    try {
      setActionLoading(true);
      await api.createCourseModule(selectedCourseId, {
        title: title.trim(),
        description: 'Created from the faculty workspace.',
      });
      await loadCourseDetails(selectedCourseId);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to add this module.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateLesson = async (title) => {
    const lessonTitle = String(title || lessonDraft.title).trim();
    const description = lessonDraft.description.trim();
    const youtubeUrl = lessonDraft.youtubeUrl.trim();
    if (!selectedCourseId || !lessonTitle) {
      setErrorMessage('Lesson title is required.');
      return;
    }
    if (youtubeUrl && !isYouTubeUrl(youtubeUrl)) {
      setErrorMessage('Enter a valid YouTube URL.');
      return;
    }

    try {
      setActionLoading(true);
      let targetModuleId = selectedModuleId;
      if (!targetModuleId) {
        const module = await api.createCourseModule(selectedCourseId, {
          title: 'Lessons',
          description: 'Course lesson content.',
        });
        targetModuleId = module.id;
      }
      const module = courseModules.find((item) => item.id === targetModuleId);
      const nextOrder = (module?.lessons?.length || 0) + 1;
      const lesson = await api.createLesson(targetModuleId, {
        title: lessonTitle,
        content: serializeLessonContent(description, youtubeUrl),
        lessonOrder: nextOrder,
      });
      setLessonDraft({ title: '', description: '', youtubeUrl: '' });
      await loadCourseDetails(selectedCourseId);
      setSelectedLessonId(lesson.id);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to add this lesson.');
    } finally {
      setActionLoading(false);
    }
  };

  const beginLessonEdit = (lesson) => {
    const details = parseLessonContent(lesson.content);
    setSelectedLessonId(lesson.id);
    setEditingLessonId(lesson.id);
    setLessonEditDraft({ title: lesson.title || '', description: details.description, youtubeUrl: details.youtubeUrl });
  };

  const handleSaveLesson = async () => {
    if (!editingLessonId) return;
    const title = lessonEditDraft.title.trim();
    const youtubeUrl = lessonEditDraft.youtubeUrl.trim();
    if (!title) {
      setErrorMessage('Lesson title is required.');
      return;
    }
    if (youtubeUrl && !isYouTubeUrl(youtubeUrl)) {
      setErrorMessage('Enter a valid YouTube URL.');
      return;
    }

    try {
      setActionLoading(true);
      const lesson = await api.updateLesson(editingLessonId, {
        title,
        content: serializeLessonContent(lessonEditDraft.description.trim(), youtubeUrl),
      });
      await loadCourseDetails(selectedCourseId);
      setSelectedLessonId(lesson.id);
      setEditingLessonId(null);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update this lesson.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLesson = async (lesson) => {
    if (!lesson?.id || !window.confirm(`Delete "${lesson.title}"?`)) return;
    try {
      setActionLoading(true);
      await api.deleteLesson(lesson.id);
      setEditingLessonId(null);
      await loadCourseDetails(selectedCourseId);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete this lesson.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateMaterial = async () => {
    if (!selectedCourseId) return;

    const title = materialDraft.title.trim();
    const fileUrl = materialDraft.fileUrl.trim();
    if (!title || (!fileUrl && !materialDraft.file)) {
      setErrorMessage('Enter a title and choose a file or provide a resource URL.');
      return;
    }
    if (fileUrl && materialDraft.file) {
      setErrorMessage('Add an uploaded file or an external resource URL, not both in one material.');
      return;
    }

    try {
      setActionLoading(true);
      await api.createCourseMaterial(selectedCourseId, {
        title,
        fileUrl,
        fileType: materialDraft.fileType,
        file: materialDraft.file,
      });
      setMaterialDraft({ title: '', fileUrl: '', fileType: 'document', file: null });
      setCourseMaterials(await api.getCourseMaterials(selectedCourseId));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to add course material.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadMaterial = async (material) => {
    try {
      const blob = await api.downloadCourseMaterial(material.id);
      const downloadUrl = URL.createObjectURL(blob);
      const extension = String(material.file_url || '').split('/').pop()?.split('.').pop() || material.file_type || 'file';
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${String(material.title || 'course-material').replace(/[^a-z0-9._-]+/gi, '_')}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to download this material.');
    }
  };

  const allLessons = useMemo(
    () => courseModules.flatMap((module) => (module.lessons || []).map((lesson) => ({ ...lesson, moduleTitle: module.title }))),
    [courseModules],
  );

  const currentLesson = useMemo(
    () => allLessons.find((lesson) => String(lesson.id) === String(selectedLessonId)) || allLessons[0] || null,
    [allLessons, selectedLessonId],
  );
  const currentLessonDetails = parseLessonContent(currentLesson?.content);
  const selectedSubmission = assignmentSubmissions.find((submission) => String(submission.id) === String(selectedSubmissionId)) || null;

  const renderCourseDetail = () => (
    <div className="course-layout">
      <aside className="panel learning-sidebar">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">Current course</p>
            <h2>{selectedCourse?.title || 'Course'}</h2>
          </div>
        </div>
        <div className="module-list">
          {(courseModules || []).map((module) => (
            <button
              className={`module-item ${selectedModuleId === module.id ? 'active' : ''}`}
              key={module.id}
              type="button"
              onClick={() => {
                setSelectedModuleId(module.id);
                setSelectedLessonId(module.lessons?.[0]?.id || null);
              }}
            >
              <span className="module-dot" />
              <span>{module.title}</span>
            </button>
          ))}
        </div>
        <div className="side-summary">
          <p>Instructor</p>
          <strong>{selectedCourse?.username || 'Faculty'}</strong>
          <p>Enrollment</p>
          <strong>{selectedCourse?.isEnrolled ? 'Enrolled' : 'Not enrolled'}</strong>
          {!selectedCourse?.isEnrolled && effectiveRole === 'student' && (
            <button className="primary-button full-width" type="button" onClick={() => handleEnroll(selectedCourseId)}>
              {actionLoading ? 'Enrolling…' : 'Enroll'}
            </button>
          )}
        </div>
      </aside>

      <section className="panel learning-main">
        <div className="course-banner">
          <div>
            <p className="eyebrow">Lesson content</p>
            <h1>{currentLesson ? currentLesson.title : 'Select a lesson'}</h1>
          </div>
          <button className="ghost-button" type="button" onClick={() => setActivePage('My Courses')}>
            Back to courses
          </button>
          {effectiveRole === 'student' && currentLesson && (
            <button className="primary-button" type="button" onClick={() => handleCompleteLesson(currentLesson.id)} disabled={actionLoading}>
              {actionLoading ? 'Updating…' : 'Mark complete'}
            </button>
          )}
        </div>

        <div className="video-frame">
          {currentLessonDetails.youtubeUrl ? (
            <a className="video-placeholder video-link" href={currentLessonDetails.youtubeUrl} target="_blank" rel="noreferrer">
              <span className="play-button" aria-hidden="true">▶</span>
              <span>{currentLesson?.title}</span>
              <strong>Watch lesson video</strong>
            </a>
          ) : (
            <div className="video-placeholder">
              <span className="play-button" aria-hidden="true">▶</span>
              <span>{currentLesson ? 'No video link for this lesson' : 'Lesson video will appear here'}</span>
            </div>
          )}
        </div>

        <div className="panel assignment-panel course-resources-panel">
          <div className="section-head compact">
            <div>
              <p className="eyebrow">Course materials</p>
              <h2>Resources</h2>
            </div>
          </div>

          {effectiveRole === 'faculty' && (
            <div className="assignment-form">
              <label>
                Course
                <select value={selectedCourseId || ''} onChange={(event) => handleOpenCourse(Number(event.target.value))}>
                  {facultyCourseCards.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </label>
              <input
                type="text"
                value={materialDraft.title}
                onChange={(event) => setMaterialDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Material title"
              />
              <input
                type="url"
                value={materialDraft.fileUrl}
                onChange={(event) => setMaterialDraft((current) => ({ ...current, fileUrl: event.target.value }))}
                placeholder="Resource URL or notes"
              />
              <input
                type="file"
                aria-label="Choose a course material file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,.mp4,.webm"
                onChange={(event) => setMaterialDraft((current) => ({ ...current, file: event.target.files?.[0] || null }))}
              />
              <div className="assignment-form-row">
                <select
                  value={materialDraft.fileType}
                  onChange={(event) => setMaterialDraft((current) => ({ ...current, fileType: event.target.value }))}
                >
                  <option value="document">Document</option>
                  <option value="pdf">PDF</option>
                  <option value="notes">Notes</option>
                  <option value="video">Video</option>
                  <option value="youtube">YouTube</option>
                  <option value="image">Image</option>
                  <option value="other">Other</option>
                </select>
                <button type="button" className="primary-button" onClick={handleCreateMaterial} disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Add material'}
                </button>
              </div>
            </div>
          )}

          {courseMaterials.length ? (
            <ul className="resource-list">
              {courseMaterials.map((material) => (
                <li key={material.id}>
                  {String(material.file_url || material.fileUrl || '').startsWith('upload:') ? (
                    <button type="button" className="lesson-link" onClick={() => handleDownloadMaterial(material)}>
                      {material.title} · Download
                    </button>
                  ) : (
                    <a href={material.file_url || material.fileUrl} target="_blank" rel="noreferrer">{material.title}</a>
                  )}
                  <span>{material.file_type || material.fileType || 'document'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">No course materials are available yet.</div>
          )}
        </div>

        <div className="panel assignment-panel course-assignments-panel">
          <div className="section-head compact">
            <div>
              <p className="eyebrow">Assignments</p>
              <h2>Course assignments</h2>
            </div>
          </div>

          {effectiveRole === 'faculty' && (
            <div className="assignment-form">
              <input
                type="text"
                value={assignmentDraft.title}
                onChange={(event) => setAssignmentDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Assignment title"
              />
              <textarea
                value={assignmentDraft.description}
                onChange={(event) => setAssignmentDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short assignment description"
              />
              <div className="assignment-form-row">
                <input
                  type="date"
                  value={assignmentDraft.dueDate}
                  onChange={(event) => setAssignmentDraft((current) => ({ ...current, dueDate: event.target.value }))}
                />
                <input
                  type="number"
                  min="1"
                  value={assignmentDraft.maxScore}
                  onChange={(event) => setAssignmentDraft((current) => ({ ...current, maxScore: event.target.value }))}
                  placeholder="Max marks"
                />
              </div>
              <input
                type="url"
                value={assignmentDraft.resourceUrl}
                onChange={(event) => setAssignmentDraft((current) => ({ ...current, resourceUrl: event.target.value }))}
                placeholder="Optional assignment resource URL"
              />
              <label>
                Publication status
                <select value={assignmentDraft.status} onChange={(event) => setAssignmentDraft((current) => ({ ...current, status: event.target.value }))}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <button type="button" className="primary-button" onClick={handleCreateAssignment} disabled={actionLoading}>
                {actionLoading ? 'Saving…' : 'Create assignment'}
              </button>
            </div>
          )}

          <AssignmentList
            assignments={courseAssignments}
            selectedId={selectedAssignmentId}
            onOpen={openAssignment}
            emptyText={effectiveRole === 'faculty' ? 'No assignments yet for this course.' : 'No assignments available for this course.'}
          />

          {assignmentDetail && (
            <div className="assignment-detail-card">
              <div className="assignment-detail-header">
                <div>
                  <p className="eyebrow">Selected assignment</p>
                  <h3>{assignmentDetail.title}</h3>
                </div>
                {effectiveRole === 'faculty' && (
                  <button type="button" className="ghost-button" onClick={() => handleDeleteAssignment(assignmentDetail.id)}>
                    Delete
                  </button>
                )}
              </div>

              <div className="assignment-detail-grid">
                <div>
                  <p><strong>Description:</strong> {assignmentDetail.description || 'No description provided.'}</p>
                  <p><strong>Due date:</strong> {assignmentDetail.due_date || assignmentDetail.dueDate || 'Not set'}</p>
                  <p><strong>Maximum marks:</strong> {assignmentDetail.max_score || assignmentDetail.maxScore || 100}</p>
                  {(assignmentDetail.resource_url || assignmentDetail.resourceUrl) && (
                    <p><strong>Resource:</strong> <a href={assignmentDetail.resource_url || assignmentDetail.resourceUrl} target="_blank" rel="noreferrer">Open assignment resource</a></p>
                  )}
                </div>

                {effectiveRole === 'student' && (
                  <div className="submission-box">
                    <h4>Your submission</h4>
                    {myAssignmentSubmission ? (
                      <div>
                        <p><strong>Status:</strong> {myAssignmentSubmission.status || 'Submitted'}</p>
                        <p><strong>Submitted:</strong> {myAssignmentSubmission.submitted_at || 'No data available'}</p>
                        <p><strong>Marks:</strong> {myAssignmentSubmission.score ?? 'Pending'}</p>
                        <p><strong>Feedback:</strong> {myAssignmentSubmission.feedback || 'No feedback yet.'}</p>
                        <p><strong>Submission:</strong> {myAssignmentSubmission.content || 'No content available.'}</p>
                        {myAssignmentSubmission.file_url && <p><strong>Attachment:</strong> <a href={myAssignmentSubmission.file_url} target="_blank" rel="noreferrer">Open submitted file</a></p>}
                      </div>
                    ) : (
                      <div className="submission-form">
                        <textarea
                          value={assignmentSubmissionText}
                          onChange={(event) => setAssignmentSubmissionText(event.target.value)}
                          placeholder="Write your assignment submission here..."
                        />
                        <input
                          type="url"
                          value={assignmentSubmissionFileUrl}
                          onChange={(event) => setAssignmentSubmissionFileUrl(event.target.value)}
                          placeholder="Optional attachment URL"
                        />
                        <button type="button" className="primary-button" onClick={handleSubmitAssignment} disabled={actionLoading}>
                          {actionLoading ? 'Submitting…' : 'Submit assignment'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {(effectiveRole === 'faculty' || effectiveRole === 'admin') && (
                  <div className="submission-box">
                    <h4>Submissions</h4>
                    {assignmentSubmissions.length ? (
                      <div className="submission-list">
                        {assignmentSubmissions.map((submission) => (
                          <button
                            key={submission.id}
                            type="button"
                            className={selectedSubmissionId === submission.id ? 'submission-row active' : 'submission-row'}
                            onClick={() => {
                              setSelectedSubmissionId(submission.id);
                              setSubmissionScore(submission.score ? String(submission.score) : '');
                              setSubmissionFeedback(submission.feedback || '');
                            }}
                          >
                            <div>
                              <strong>{submission.username || 'Student'}</strong>
                              <small>{submission.status || 'Submitted'}</small>
                            </div>
                            <span>{submission.score ?? 'Pending'}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p>No submissions yet.</p>
                    )}

                    {selectedSubmissionId && (
                      <div className="evaluation-form">
                        <h5>Evaluate selected submission</h5>
                        {selectedSubmission && (
                          <div className="submission-preview">
                            <p><strong>Student:</strong> {`${selectedSubmission.first_name || ''} ${selectedSubmission.last_name || ''}`.trim() || selectedSubmission.username || 'No data available'}</p>
                            <p><strong>Submitted:</strong> {selectedSubmission.submitted_at || 'No data available'}</p>
                            <p><strong>Status:</strong> {selectedSubmission.status || 'No data available'}</p>
                            <p><strong>Answer:</strong> {selectedSubmission.content || 'No data available'}</p>
                            {selectedSubmission.file_url && <p><strong>Attachment:</strong> <a href={selectedSubmission.file_url} target="_blank" rel="noreferrer">Open submission file</a></p>}
                            <p><strong>Current marks:</strong> {selectedSubmission.score ?? 'Not graded'}</p>
                            <p><strong>Current feedback:</strong> {selectedSubmission.feedback || 'No data available'}</p>
                          </div>
                        )}
                        <textarea
                          value={submissionFeedback}
                          onChange={(event) => setSubmissionFeedback(event.target.value)}
                          placeholder="Add feedback for the student"
                        />
                        <input
                          type="number"
                          min="0"
                          value={submissionScore}
                          onChange={(event) => setSubmissionScore(event.target.value)}
                          placeholder="Enter marks"
                        />
                        <button type="button" className="primary-button" onClick={handleEvaluateSubmission} disabled={actionLoading}>
                          {actionLoading ? 'Saving…' : 'Save evaluation'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="panel assignment-panel course-quizzes-panel">
          <div className="section-head compact">
            <div>
              <p className="eyebrow">Quizzes</p>
              <h2>Course quizzes</h2>
            </div>
          </div>

          {effectiveRole === 'faculty' && (
            <div className="assignment-form">
              <label>
                Course
                <select value={selectedCourseId || ''} onChange={(event) => handleOpenCourse(Number(event.target.value))}>
                  {facultyCourseCards.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </label>
              <input
                type="text"
                value={quizDraft.title}
                onChange={(event) => setQuizDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Quiz title"
              />
              <textarea
                value={quizDraft.description}
                onChange={(event) => setQuizDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Quiz description"
              />
              <input
                type="date"
                value={quizDraft.dueDate}
                onChange={(event) => setQuizDraft((current) => ({ ...current, dueDate: event.target.value }))}
              />
              <div className="assignment-form-row">
                <input
                  type="text"
                  value={quizDraft.questions[0].questionText}
                  onChange={(event) => setQuizDraft((current) => ({
                    ...current,
                    questions: [{ ...current.questions[0], questionText: event.target.value }],
                  }))}
                  placeholder="Question text"
                />
              </div>
              <div className="assignment-form-row">
                <input value={quizDraft.questions[0].optionA} onChange={(event) => setQuizDraft((current) => ({ ...current, questions: [{ ...current.questions[0], optionA: event.target.value }] }))} placeholder="Option A" />
                <input value={quizDraft.questions[0].optionB} onChange={(event) => setQuizDraft((current) => ({ ...current, questions: [{ ...current.questions[0], optionB: event.target.value }] }))} placeholder="Option B" />
              </div>
              <div className="assignment-form-row">
                <input value={quizDraft.questions[0].optionC} onChange={(event) => setQuizDraft((current) => ({ ...current, questions: [{ ...current.questions[0], optionC: event.target.value }] }))} placeholder="Option C" />
                <input value={quizDraft.questions[0].optionD} onChange={(event) => setQuizDraft((current) => ({ ...current, questions: [{ ...current.questions[0], optionD: event.target.value }] }))} placeholder="Option D" />
              </div>
              <div className="assignment-form-row">
                <label>
                  Correct answer
                  <select value={quizDraft.questions[0].correctAnswer} onChange={(event) => setQuizDraft((current) => ({ ...current, questions: [{ ...current.questions[0], correctAnswer: event.target.value }] }))}>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </label>
                <input aria-label="Marks" type="number" min="1" value={quizDraft.questions[0].points} onChange={(event) => setQuizDraft((current) => ({ ...current, questions: [{ ...current.questions[0], points: event.target.value }] }))} placeholder="Marks" />
              </div>
              <button type="button" className="primary-button" onClick={handleCreateQuiz} disabled={actionLoading}>
                {actionLoading ? 'Saving…' : 'Create quiz'}
              </button>
            </div>
          )}

          {courseQuizzes.length ? (
            <div className="submission-list">
              {courseQuizzes.map((quiz) => (
                <div key={quiz.id} className="stack-row">
                  <div>
                    <strong>{quiz.title}</strong>
                    <small>{quiz.description || 'No description.'}</small>
                  </div>
                  {effectiveRole === 'student' && (
                    <div className="submission-form" style={{ width: '100%' }}>
                      {quiz.myAttempt ? (
                        <p><strong>Score:</strong> {quiz.myAttempt.score} / {quiz.questions.reduce((total, question) => total + Number(question.points || 1), 0)}</p>
                      ) : (
                        <>
                          {quiz.questions.map((question, index) => (
                            <div key={question.id} style={{ marginBottom: '0.75rem' }}>
                              <p><strong>{index + 1}. {question.question_text || question.questionText}</strong></p>
                              {['A', 'B', 'C', 'D'].map((optionKey) => {
                                const optionValue = question[`option_${optionKey.toLowerCase()}`] || question[`option${optionKey}`] || '';
                                return (
                                  <label key={optionKey} style={{ display: 'block', margin: '0.2rem 0' }}>
                                    <input
                                      type="radio"
                                      name={`quiz-${quiz.id}-question-${question.id}`}
                                      checked={String((quizAttemptAnswers[quiz.id] || []).find((answer) => answer.questionId === question.id)?.selectedAnswer || '') === optionKey}
                                      onChange={() => setQuizAttemptAnswers((current) => {
                                        const existing = current[quiz.id] || [];
                                        const next = existing.filter((answer) => answer.questionId !== question.id);
                                        return { ...current, [quiz.id]: [...next, { questionId: question.id, selectedAnswer: optionKey }] };
                                      })}
                                    />
                                    {' '}{optionKey}. {optionValue}
                                  </label>
                                );
                              })}
                            </div>
                          ))}
                          <button type="button" className="primary-button" onClick={() => handleSubmitQuizAttempt(quiz.id)} disabled={actionLoading}>
                            {actionLoading ? 'Submitting…' : 'Submit quiz'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {effectiveRole === 'faculty' && quiz.attempts?.length > 0 && (
                    <div className="submission-list" aria-label={`${quiz.title} results`}>
                      {quiz.attempts.map((attempt) => (
                        <div className="submission-row" key={attempt.id}>
                          <div><strong>{attempt.first_name} {attempt.last_name}</strong><small>{attempt.username}</small></div>
                          <span>{attempt.score} / {quiz.questions.reduce((total, question) => total + Number(question.points || 1), 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No quizzes available for this course yet.</div>
          )}
        </div>

        <div className="learning-grid course-lesson-grid">
          <article className="panel inner-panel">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">Lessons</p>
                <h2>Available lessons</h2>
              </div>
            </div>
            <ul className="resource-list">
              {allLessons.length ? allLessons.map((lesson) => (
                <li className="course-lesson-item" key={lesson.id}>
                  <button
                    className={String(selectedLessonId) === String(lesson.id) ? 'lesson-link active' : 'lesson-link'}
                    type="button"
                    aria-current={String(selectedLessonId) === String(lesson.id) ? 'true' : undefined}
                    onClick={() => {
                      setSelectedLessonId(lesson.id);
                      setEditingLessonId(null);
                    }}
                  >
                    {lesson.moduleTitle} · {lesson.title}
                  </button>
                  {effectiveRole === 'faculty' && (
                    <div className="course-lesson-actions">
                      <button type="button" className="ghost-button" onClick={() => beginLessonEdit(lesson)}>Edit</button>
                      <button type="button" className="ghost-button" onClick={() => handleDeleteLesson(lesson)} disabled={actionLoading}>Delete</button>
                    </div>
                  )}
                </li>
              )) : <li>No lessons available.</li>}
            </ul>
          </article>

          <article className="panel inner-panel">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">Details</p>
                <h2>Lesson overview</h2>
              </div>
            </div>
            <div className="resource-list">
              {editingLessonId && String(editingLessonId) === String(currentLesson?.id) ? (
                <div className="lesson-editor">
                  <h3>Edit lesson</h3>
                  <input value={lessonEditDraft.title} onChange={(event) => setLessonEditDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Lesson title" />
                  <textarea value={lessonEditDraft.description} onChange={(event) => setLessonEditDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Short lesson description" />
                  <input type="url" value={lessonEditDraft.youtubeUrl} onChange={(event) => setLessonEditDraft((current) => ({ ...current, youtubeUrl: event.target.value }))} placeholder="YouTube URL (optional)" />
                  <div className="lesson-editor-actions">
                    <button type="button" className="primary-button" onClick={handleSaveLesson} disabled={actionLoading}>{actionLoading ? 'Saving…' : 'Save lesson'}</button>
                    <button type="button" className="ghost-button" onClick={() => setEditingLessonId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <p>{currentLessonDetails.description || (currentLesson ? 'No lesson description available.' : 'Select a lesson from the list to view its content.')}</p>
              )}
              {effectiveRole === 'faculty' && (
                <div className="lesson-editor">
                  <h3>Add lesson</h3>
                  <input
                    type="text"
                    value={lessonDraft.title}
                    onChange={(event) => setLessonDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Lesson title"
                  />
                  <textarea
                    value={lessonDraft.description}
                    onChange={(event) => setLessonDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Short lesson description"
                  />
                  <input
                    type="url"
                    value={lessonDraft.youtubeUrl}
                    onChange={(event) => setLessonDraft((current) => ({ ...current, youtubeUrl: event.target.value }))}
                    placeholder="YouTube URL (optional)"
                  />
                  <div className="lesson-editor-actions">
                    <input
                      type="text"
                      placeholder="New module title"
                      className="module-input"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleCreateModule(event.target.value);
                          event.target.value = '';
                        }
                      }}
                    />
                    <button type="button" className="primary-button" onClick={() => handleCreateLesson()} disabled={actionLoading}>
                      {actionLoading ? 'Saving…' : 'Add lesson'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );

  const studentProgressRows = useMemo(() => (
    myCourses.map((course) => {
      const progress = Number(course.progress || 0);
      return {
        name: course.title,
        course: course.description || 'Course work',
        progress,
        due: `${progress}% complete`,
        status: progress >= 75 ? 'Completed' : progress > 0 ? 'In progress' : 'Not started',
        score: `${progress}%`,
      };
    })
  ), [myCourses]);

  const facultyStudentRows = useMemo(() => (
    facultyRoster.map((student) => ({
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username || 'Student',
      course: student.course || student.courseTitle || 'Course',
      due: `${Number(student.progress || student.completion || 0)}%`,
      status: Number(student.progress || student.completion || 0) >= 75 ? 'On track' : 'In progress',
      score: `${Number(student.progress || student.completion || 0)}%`,
    }))
  ), [facultyRoster]);

  const renderPages = {
    'My Courses': () => {
      const isFaculty = effectiveRole === 'faculty';
      const ownedCourses = facultyCourseCards;

      return (
        <div className="page-shell">
          <section className="panel page-header-panel">
            <div>
              <p className="eyebrow">Academic workspace</p>
              <h2>My Courses</h2>
            </div>
            {isFaculty && (
              <button type="button" className="primary-button" onClick={handleCreateCourse} disabled={actionLoading}>
                {actionLoading ? 'Creating...' : 'Create course'}
              </button>
            )}
          </section>

          {isFaculty ? (
            <section className="panel panel-list">
              <div className="section-head"><div><p className="eyebrow">Teaching</p><h2>Your courses</h2></div></div>
              {ownedCourses.length ? (
                <CourseList courses={ownedCourses} onOpenCourse={handleOpenCourse} />
              ) : (
                <div className="empty-state">Create a course to begin managing lessons, materials, and assignments.</div>
              )}
            </section>
          ) : (
            <>
              <section className="panel panel-list">
                <div className="section-head"><div><p className="eyebrow">Learning</p><h2>Enrolled courses</h2></div></div>
                {myCourses.length ? (
                  <CourseList courses={studentCourseCards} onOpenCourse={handleOpenCourse} />
                ) : (
                  <div className="empty-state">You are not enrolled in any courses yet.</div>
                )}
              </section>
              <section className="panel panel-list">
                <div className="section-head"><div><p className="eyebrow">Course catalog</p><h2>Available courses</h2></div></div>
                {availableCourseCards.length ? (
                  <CourseList courses={availableCourseCards} onOpenCourse={handleOpenCourse} />
                ) : (
                  <div className="empty-state">You are enrolled in every available course.</div>
                )}
              </section>
            </>
          )}
        </div>
      );
    },
    Assignments: () => {
      const assignments = effectiveRole === 'student' ? studentAssignments : courseAssignments;

      return (
        <div className="page-shell">
          <section className="panel page-header-panel">
            <div><p className="eyebrow">Course workload</p><h2>Assignments</h2></div>
          </section>
          <section className="panel panel-list">
            <AssignmentList
              assignments={assignments}
              selectedId={selectedAssignmentId}
              onOpen={async (assignmentId) => {
                await openAssignment(assignmentId);
                setActivePage('Assignment Detail');
              }}
              emptyText="No assignments are available for your enrolled courses."
            />
          </section>
        </div>
      );
    },
    'Assignment Detail': () => (
      <div className="page-shell">
        <section className="panel page-header-panel">
          <div><p className="eyebrow">Assignment</p><h2>{assignmentDetail?.title || 'Assignment details'}</h2></div>
          <button type="button" className="ghost-button" onClick={() => setActivePage('Assignments')}>Back to assignments</button>
        </section>
        {assignmentDetail ? (
          <section className="panel panel-list">
            <p><strong>Description:</strong> {assignmentDetail.description || 'No description provided.'}</p>
            <p><strong>Course:</strong> {assignmentDetail.course_title || assignmentDetail.courseTitle || 'Course'}</p>
            <p><strong>Due date:</strong> {assignmentDetail.due_date || assignmentDetail.dueDate || 'Not set'}</p>
            <p><strong>Maximum marks:</strong> {assignmentDetail.max_score || assignmentDetail.maxScore || 100}</p>
            {(assignmentDetail.resource_url || assignmentDetail.resourceUrl) && (
              <p><strong>Resource:</strong> <a href={assignmentDetail.resource_url || assignmentDetail.resourceUrl} target="_blank" rel="noreferrer">Open assignment resource</a></p>
            )}
            {effectiveRole === 'student' && (
              <div className="submission-box">
                <h4>Your submission</h4>
                {myAssignmentSubmission ? (
                  <div>
                    <p><strong>Status:</strong> {myAssignmentSubmission.status || 'Submitted'}</p>
                    <p><strong>Submitted:</strong> {myAssignmentSubmission.submitted_at || 'No data available'}</p>
                    <p><strong>Marks:</strong> {myAssignmentSubmission.score ?? 'Pending'}</p>
                    <p><strong>Feedback:</strong> {myAssignmentSubmission.feedback || 'No feedback yet.'}</p>
                    <p><strong>Submission:</strong> {myAssignmentSubmission.content || 'No content available.'}</p>
                    {myAssignmentSubmission.file_url && <p><strong>Attachment:</strong> <a href={myAssignmentSubmission.file_url} target="_blank" rel="noreferrer">Open submitted file</a></p>}
                  </div>
                ) : (
                  <div className="submission-form">
                    <textarea value={assignmentSubmissionText} onChange={(event) => setAssignmentSubmissionText(event.target.value)} placeholder="Write your assignment submission here..." />
                    <input type="url" value={assignmentSubmissionFileUrl} onChange={(event) => setAssignmentSubmissionFileUrl(event.target.value)} placeholder="Optional attachment URL" />
                    <button type="button" className="primary-button" onClick={handleSubmitAssignment} disabled={actionLoading}>
                      {actionLoading ? 'Submitting...' : 'Submit assignment'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <div className="empty-state">Select an assignment to view its details.</div>
        )}
      </div>
    ),
    Students: () => (
      <ModulePage
        title="Students"
        highlight="Course rosters"
        rows={facultyStudentRows}
        emptyMessage="There are no enrolled students in your courses yet."
      />
    ),
    Courses: () => (
      <div className="page-shell">
        <section className="panel page-header-panel">
          <div><p className="eyebrow">Course catalog</p><h2>Courses</h2></div>
          <span className="page-pill">System courses</span>
        </section>
        <section className="panel panel-list">
          <div className="section-head"><div><p className="eyebrow">Available courses</p><h2>All courses</h2></div></div>
          {adminCourseCards.length ? (
            <div className="stack-list admin-stack-list">
              {adminCourseCards.map((course) => {
                const isExpanded = expandedCourseId === course.id;
                const courseRecord = courses.find((item) => Number(item.id) === Number(course.id));
                const enrollmentCount = courseEnrollmentMap[course.id] ?? Number(courseRecord?.enrollmentCount ?? 0);

                return (
                  <div key={course.id} className="stack-row admin-course-row">
                    <button type="button" className="admin-course-toggle" onClick={() => toggleCourseExpansion(course.id)}>
                      <div>
                        <strong>{course.title}</strong>
                        <small>{course.instructor}</small>
                      </div>
                      <span>{isExpanded ? 'Hide' : 'View'} details</span>
                    </button>
                    {isExpanded && (
                      <div className="admin-detail-panel">
                        <p><strong>Course title:</strong> {course.title}</p>
                        <p><strong>Faculty teaching it:</strong> {course.instructor}</p>
                        <p><strong>Actual number of enrolled students:</strong> {enrollmentCount}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No courses are available in the system yet.</div>
          )}
        </section>
      </div>
    ),
    Announcements: () => (
      <div className="page-shell">
        <section className="panel page-header-panel"><div><p className="eyebrow">Announcements</p><h2>Course announcements</h2></div></section>

        {effectiveRole === 'faculty' && (
          <section className="panel panel-list">
            <div className="section-head"><div><p className="eyebrow">Create announcement</p><h2>Post to one of your courses</h2></div></div>
            <div className="panel-body">
              <label>
                Course
                <select value={facultyAnnouncementDraft.courseId} onChange={(e) => setFacultyAnnouncementDraft((c) => ({ ...c, courseId: e.target.value }))}>
                  <option value="">Select a course</option>
                  {facultyCourseCards.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </label>
              <label>
                Title
                <input type="text" value={facultyAnnouncementDraft.title} onChange={(e) => setFacultyAnnouncementDraft((c) => ({ ...c, title: e.target.value }))} />
              </label>
              <label>
                Message
                <textarea value={facultyAnnouncementDraft.content} onChange={(e) => setFacultyAnnouncementDraft((c) => ({ ...c, content: e.target.value }))} />
              </label>
              <div className="quick-actions">
                <button type="button" className="primary-button" onClick={async () => {
                  if (!facultyAnnouncementDraft.courseId || !facultyAnnouncementDraft.title.trim() || !facultyAnnouncementDraft.content.trim()) {
                    setErrorMessage('Please select a course and fill title and message.');
                    return;
                  }
                  try {
                    setAnnouncementActionLoading(true);
                    await api.createAnnouncement(facultyAnnouncementDraft.courseId, {
                      title: facultyAnnouncementDraft.title.trim(),
                      content: facultyAnnouncementDraft.content.trim(),
                    });
                    // refresh announcements
                    const items = await api.getAnnouncements();
                    setStudentAnnouncements(items || []);
                    setFacultyAnnouncementDraft({ title: '', content: '', courseId: '' });
                    setErrorMessage('');
                  } catch (err) {
                    setErrorMessage(err.message || 'Unable to post announcement.');
                  } finally {
                    setAnnouncementActionLoading(false);
                  }
                }} disabled={announcementActionLoading}>{announcementActionLoading ? 'Posting…' : 'Post announcement'}</button>
              </div>
            </div>
          </section>
        )}

        <section className="panel panel-list table-panel">
          <div className="section-head"><div><p className="eyebrow">Feed</p><h2>Recent announcements</h2></div></div>
          <div className="panel-body">
            {studentAnnouncements && studentAnnouncements.length ? (
              <div className="stack-list">
                {studentAnnouncements.map((a) => (
                  <div className="stack-row" key={a.id}>
                    <div>
                      <strong>{a.title}</strong>
                      <small>{a.content}</small>
                    </div>
                    <div className="score-box"><span>{a.course_title || a.courseTitle || ''}</span></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No new announcements.</div>
            )}
          </div>
        </section>
      </div>
    ),
    Profile: () => {
      if (effectiveRole === 'admin') {
        return (
          <div className="page-shell">
            <section className="panel page-header-panel">
              <div><p className="eyebrow">User records</p><h2>Admin Profile</h2></div>
              <span className="page-pill">System overview</span>
            </section>

            <section className="panel panel-list admin-summary-grid">
              <div className="admin-stat-card">
                <span className="eyebrow">Faculty</span>
                <strong>{adminFacultyCount}</strong>
              </div>
              <div className="admin-stat-card">
                <span className="eyebrow">Students</span>
                <strong>{adminStudentCount}</strong>
              </div>
            </section>

            <section className="panel panel-list table-panel">
              <div className="section-head"><div><p className="eyebrow">Students</p><h2>Registered student profiles</h2></div></div>
              <div className="data-table">
                <div className="table-header"><span>Name</span><span>Username</span><span>Email</span><span>Role</span></div>
                {adminStudents.length ? adminStudents.map((user) => {
                  const isExpanded = expandedStudentId === user.id;
                  const details = adminStudentDetailMap[user.id];
                  return (
                    <div className="admin-student-record" key={`student-${user.id}`}>
                      <button
                        type="button"
                        className="student-summary-row"
                        aria-expanded={isExpanded}
                        aria-controls={`student-details-${user.id}`}
                        onClick={() => toggleStudentExpansion(user)}
                      >
                        <span>{getFullName(user)}</span>
                        <span>{user.username}</span>
                        <span>{user.email}</span>
                        <span>{user.role_name || 'student'}</span>
                        <span className="student-row-indicator" aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                      </button>
                      {isExpanded && (
                        <div className="admin-detail-panel student-detail-panel" id={`student-details-${user.id}`}>
                          {studentDetailLoadingId === user.id ? (
                            <p className="empty-state">Loading student details…</p>
                          ) : (
                            <>
                              <div className="student-detail-grid">
                                <p><strong>Full name:</strong> {getFullName(user) || 'No data available'}</p>
                                <p><strong>Username:</strong> {user.username || 'No data available'}</p>
                                <p><strong>Email:</strong> {user.email || 'No data available'}</p>
                                <p><strong>Role:</strong> {user.role_name || 'No data available'}</p>
                              </div>
                              <h3>Enrollment and course progress</h3>
                              {details?.courses?.length ? details.courses.map((course) => (
                                <section className="student-course-detail" key={course.id}>
                                  <h4>{course.title} <span>({course.code || 'No course code'})</span></h4>
                                  <p><strong>Enrollment:</strong> {course.enrollment.status || 'No data available'}</p>
                                  <p><strong>Enrolled:</strong> {course.enrollment.enrolled_at || 'No data available'}</p>
                                  <p><strong>Progress:</strong> {course.enrollment.progress == null ? 'No data available' : `${course.enrollment.progress}%`}</p>
                                  <div className="student-detail-subsection">
                                    <strong>Assignments and submissions</strong>
                                    {course.assignments.length ? (
                                      <ul>
                                        {course.assignments.map((assignment) => (
                                          <li key={assignment.id}>
                                            {assignment.title}: {assignment.submission
                                              ? `${assignment.submission.status || 'Submitted'}${assignment.submission.score == null ? '' : `, ${assignment.submission.score}/${assignment.max_score} marks`}`
                                              : 'No submission'}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : <p>No data available</p>}
                                  </div>
                                  <div className="student-detail-subsection">
                                    <strong>Quiz results</strong>
                                    {course.quizzes.some((quiz) => quiz.attempts.length) ? (
                                      <ul>
                                        {course.quizzes.flatMap((quiz) => quiz.attempts.map((attempt) => (
                                          <li key={attempt.id}>{quiz.title}: {attempt.score} marks ({attempt.status})</li>
                                        )))}
                                      </ul>
                                    ) : <p>No data available</p>}
                                  </div>
                                </section>
                              )) : <p className="empty-state">No enrollment data available</p>}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }) : <div className="empty-state">No student profiles found.</div>}
              </div>
            </section>

            <section className="panel panel-list table-panel">
              <div className="section-head"><div><p className="eyebrow">Faculty</p><h2>Teaching faculty profiles</h2></div></div>
              <div className="stack-list admin-stack-list">
                {adminFaculty.length ? adminFaculty.map((faculty) => {
                  const isExpanded = expandedFacultyId === faculty.id;
                  const facultyCourses = facultyDetailMap[faculty.id] || courses.filter((course) => String(course.faculty_id) === String(faculty.id));
                  const fullName = getFullName(faculty);
                  return (
                    <div key={`faculty-${faculty.id}`} className="stack-row faculty-row">
                      <button type="button" className="admin-course-toggle" onClick={async () => {
                        if (!isExpanded) {
                          await toggleFacultyExpansion(faculty.id);
                        } else {
                          setExpandedFacultyId(null);
                        }
                      }}>
                        <div>
                          <strong>{fullName}</strong>
                          <small>{faculty.username}</small>
                        </div>
                        <span>{isExpanded ? 'Hide' : 'Expand'} details</span>
                      </button>
                      {isExpanded && (
                        <div className="admin-detail-panel">
                          <p><strong>Full name:</strong> {fullName}</p>
                          <p><strong>Username:</strong> {faculty.username}</p>
                          <p><strong>Email:</strong> {faculty.email}</p>
                          <p><strong>Role:</strong> {faculty.role_name || 'faculty'}</p>
                          <div className="faculty-subsection">
                            <strong>Courses/subjects taught:</strong>
                            <ul>
                              {facultyCourses.length ? facultyCourses.map((course) => (
                                <li key={course.id}>{course.title}</li>
                              )) : <li>No courses assigned.</li>}
                            </ul>
                          </div>
                          <div className="faculty-subsection">
                            <strong>Materials/files uploaded by this faculty:</strong>
                            <ul>
                              {facultyCourses.length ? facultyCourses.flatMap((course) => {
                                const materials = course.materials || [];
                                return materials.length ? materials.map((material) => (
                                  <li key={`${course.id}-${material.id}`}>
                                    {course.title}: {material.title || 'Uploaded file'}
                                  </li>
                                )) : [<li key={`${course.id}-empty`}>{course.title}: No materials uploaded.</li>];
                              }) : <li>No material records.</li>}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }) : <div className="empty-state">No faculty profiles found.</div>}
              </div>
            </section>
          </div>
        );
      }

      return (
      <div className="page-shell">
        <section className="panel page-header-panel">
          <div><p className="eyebrow">Academic profile</p><h2>Profile</h2></div>
          <span className="page-pill">{currentRole.label}</span>
        </section>
        <section className="panel panel-list table-panel">
          <div className="section-head"><div><p className="eyebrow">Account</p><h2>Your details</h2></div></div>
          {authUser ? (
            <div className="data-table">
              <div className="table-header"><span>Name</span><span>Username</span><span>Email</span><span>Role</span></div>
              <div className="table-row-flex">
                <span>{`${authUser.first_name || ''} ${authUser.last_name || ''}`.trim() || authUser.username || 'User'}</span>
                <span>{authUser.username || 'Username'}</span>
                <span>{authUser.email || 'No email'}</span>
                <span>{currentRole.label}</span>
              </div>
            </div>
          ) : <div className="empty-state">Your profile details will appear here as backend data becomes available.</div>}
          {effectiveRole === 'faculty' && authUser && (
            <div className="panel-body">
              <p><strong>Age:</strong> {authUser.age || 'Not provided'}</p>
              <p><strong>Subjects/courses taught:</strong></p>
              <ul>
                {facultyCourseCards.length ? facultyCourseCards.map((course) => <li key={course.id}>{course.title}</li>) : <li>No courses assigned.</li>}
              </ul>
            </div>
          )}
        </section>
        {effectiveRole === 'student' && (
          <section className="panel panel-list table-panel">
            <div className="section-head"><div><p className="eyebrow">Learning progress</p><h2>Course completion</h2></div></div>
            {studentProgressRows.length ? (
              <div className="data-table">
                <div className="table-header"><span>Course</span><span>Description</span><span>Progress</span><span>Status</span><span>Completion</span></div>
                {studentProgressRows.map((row) => (
                  <div className="table-row-flex" key={row.name}>
                    <span>{row.name}</span><span>{row.course}</span><FormatProgress value={row.progress} />
                    <span className={`status-tag ${String(row.status).toLowerCase().replace(/\s+/g, '-')}`}>{row.status}</span><span>{row.score}</span>
                  </div>
                ))}
              </div>
            ) : <div className="empty-state">Enroll in a course to begin tracking progress.</div>}
          </section>
        )}
      </div>
      );
    },
  };

  const renderPage = () => {
    if (authLoading) {
      return (
        <div className="auth-shell">
          <div className="auth-card">
            <div className="auth-copy">
              <p className="eyebrow">University portal</p>
              <h1>Loading CloudLMS</h1>
            </div>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <AuthGate
          activeRole={activeRole}
          setActiveRole={setActiveRole}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          facultyLoginOptions={facultyLoginOptions}
          authView={authView}
          setAuthView={setAuthView}
          registrationData={registrationData}
          setRegistrationData={setRegistrationData}
          onLogin={handleLogin}
          onRegister={handleRegister}
          isSubmitting={isSubmitting}
          errorMessage={loginError}
          roleMenuOpen={roleMenuOpen}
          setRoleMenuOpen={setRoleMenuOpen}
        />
      );
    }

    if (activePage === 'Course Detail' && selectedCourse) {
      return renderCourseDetail();
    }

    return renderPages[activePage] ? renderPages[activePage]() : renderPages.Profile();
  };

  return (
    <div className="lms-app">
      {isAuthenticated && (
        <>
          <aside className="sidebar">
            <div className="brand-block">
              <div className="brand-mark">CL</div>
              <div>
                <strong>CloudLMS</strong>
                <span>Academic portal</span>
              </div>
            </div>

            <nav className="sidebar-nav" aria-label="Primary navigation">
              {currentRole.nav.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === activePage ? 'nav-button active' : 'nav-button'}
                  onClick={() => {
                    if (item === 'Logout') {
                      handleLogout();
                      return;
                    }
                    setActivePage(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </nav>

            <div className="sidebar-footer">
              <p className="eyebrow">Institution</p>
              <strong>ICFAI Foundation</strong>
              <span>Hyderabad</span>
            </div>
          </aside>

          <div className="main-panel">
            <header className="topbar">
              <div>
                <p className="eyebrow">{currentRole.overview}</p>
                <h2>{effectiveRole === 'admin' ? 'Admin workspace' : `${currentRole.label} workspace`}</h2>
              </div>

              <div className="topbar-actions">
                <div className="search-box">
                  <span>⌕</span>
                  <input type="text" value="Search courses" readOnly aria-label="Search courses" />
                </div>

                <button type="button" className="icon-button" aria-label="Notifications" onClick={() => setAnnouncementsOpen((s) => !s)}>🔔</button>
                {announcementsOpen && (
                  <div className="announcements-panel panel">
                    <div className="panel-head">
                      <strong>Announcements</strong>
                      <button type="button" className="ghost-button" onClick={() => setAnnouncementsOpen(false)}>Close</button>
                    </div>
                    <div className="panel-body">
                      {studentAnnouncements && studentAnnouncements.length ? (
                        <div className="stack-list">
                          {studentAnnouncements.map((a) => (
                            <div className="stack-row" key={a.id}>
                              <div>
                                <strong>{a.title}</strong>
                                <small>{a.content}</small>
                              </div>
                              <div className="score-box"><span>{a.course_title || a.courseTitle || ''}</span></div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">No new announcements.</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="profile-chip">
                  <div className="avatar large">{(authUser?.first_name || 'U').charAt(0)}</div>
                  <div>
                    <strong>{effectiveRole === 'admin' ? 'Admin' : (authUser ? `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim() : 'User')}</strong>
                    <small>{effectiveRole === 'admin' ? 'Administrator' : currentRole.label}</small>
                  </div>
                </div>
              </div>
            </header>

            <main className="workspace">
              {(errorMessage || loading) && (
                <div className="form-error">{loading ? 'Loading course data…' : errorMessage}</div>
              )}
              {renderPage()}
            </main>
          </div>
        </>
      )}

      {!isAuthenticated && renderPage()}
    </div>
  );
}

export default App;
