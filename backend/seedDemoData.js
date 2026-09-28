import bcrypt from 'bcryptjs';
import { getDatabase } from './config/db.js';
import { createCourse } from './models/courseModel.js';
import { createUser } from './models/userModel.js';
import { seedRoles } from './services/seedService.js';
import { seedDemoStudents } from './seedStudents.js';

const db = getDatabase();

export const demoFaculty = [
  { firstName: 'Dr. K.', lastName: 'Vara Prasada Rao', age: 47, username: 'faculty1', email: 'faculty1@cloudlms.local' },
  { firstName: 'Anuj', lastName: 'Kapoor', age: 39, username: 'anuj.kapoor', email: 'anuj.kapoor@cloudlms.local' },
  { firstName: 'Divya', lastName: 'Menon', age: 36, username: 'divya.menon', email: 'divya.menon@cloudlms.local' },
  { firstName: 'Farhan', lastName: 'Ali', age: 41, username: 'farhan.ali', email: 'farhan.ali@cloudlms.local' },
  { firstName: 'Gita', lastName: 'Iyer', age: 44, username: 'gita.iyer', email: 'gita.iyer@cloudlms.local' },
  { firstName: 'Kiran', lastName: 'Das', age: 38, username: 'kiran.das', email: 'kiran.das@cloudlms.local' },
  { firstName: 'Leena', lastName: 'Thomas', age: 35, username: 'leena.thomas', email: 'leena.thomas@cloudlms.local' },
  { firstName: 'Mohit', lastName: 'Arora', age: 42, username: 'mohit.arora', email: 'mohit.arora@cloudlms.local' },
  { firstName: 'Neha', lastName: 'Bansal', age: 37, username: 'neha.bansal', email: 'neha.bansal@cloudlms.local' },
  { firstName: 'Rakesh', lastName: 'Sinha', age: 40, username: 'rakesh.sinha', email: 'rakesh.sinha@cloudlms.local' },
  { firstName: 'Shalini', lastName: 'Nair', age: 43, username: 'shalini.nair', email: 'shalini.nair@cloudlms.local' },
  { firstName: 'Asha', lastName: 'Verma', age: 34, username: 'asha.verma', email: 'asha.verma@cloudlms.local' },
];

const demoCourses = [
  { facultyUsername: 'anuj.kapoor', code: 'CNE401', title: 'Cloud Native Engineering', description: 'Designing and operating cloud-native systems.' },
  { facultyUsername: 'anuj.kapoor', code: 'CNE402', title: 'Kubernetes Operations', description: 'Practical container orchestration and platform operations.' },
  { facultyUsername: 'divya.menon', code: 'DVA401', title: 'Data Visualization and Storytelling', description: 'Communicating analytical findings through visual narratives.' },
  { facultyUsername: 'divya.menon', code: 'DVA402', title: 'Business Intelligence Foundations', description: 'Core methods for reporting, dashboards, and decision support.' },
  { facultyUsername: 'farhan.ali', code: 'CYS401', title: 'Cybersecurity Fundamentals', description: 'Security principles, threats, and practical defenses.' },
  { facultyUsername: 'farhan.ali', code: 'CYS402', title: 'Secure Application Development', description: 'Building and reviewing secure software applications.' },
  { facultyUsername: 'gita.iyer', code: 'UXD401', title: 'Human Centered Design', description: 'Research-led methods for useful digital products.' },
  { facultyUsername: 'gita.iyer', code: 'UXD402', title: 'Interaction Design Studio', description: 'Designing accessible and effective user interactions.' },
  { facultyUsername: 'kiran.das', code: 'AIM401', title: 'Foundations of Machine Learning', description: 'Core concepts, models, and evaluation methods.' },
  { facultyUsername: 'kiran.das', code: 'AIM402', title: 'Applied Predictive Models', description: 'Developing predictive models for practical data problems.' },
  { facultyUsername: 'leena.thomas', code: 'MOB401', title: 'Mobile Application Development', description: 'Building dependable mobile applications.' },
  { facultyUsername: 'leena.thomas', code: 'MOB402', title: 'Cross Platform UI Engineering', description: 'Creating maintainable interfaces across mobile platforms.' },
  { facultyUsername: 'mohit.arora', code: 'NET401', title: 'Network Architecture', description: 'Planning reliable network systems and services.' },
  { facultyUsername: 'mohit.arora', code: 'NET402', title: 'Cloud Network Security', description: 'Securing modern cloud-connected networks.' },
  { facultyUsername: 'neha.bansal', code: 'DBE401', title: 'Database Systems Design', description: 'Relational design, integrity, and performance fundamentals.' },
  { facultyUsername: 'neha.bansal', code: 'DBE402', title: 'Data Engineering Pipelines', description: 'Reliable data ingestion, transformation, and delivery.' },
  { facultyUsername: 'rakesh.sinha', code: 'WEB401', title: 'Modern Web Engineering', description: 'Frontend and backend practices for modern web systems.' },
  { facultyUsername: 'rakesh.sinha', code: 'WEB402', title: 'Full Stack Applications', description: 'Developing integrated, production-minded web applications.' },
  { facultyUsername: 'shalini.nair', code: 'QAE401', title: 'Quality Assurance Methods', description: 'Systematic approaches to software quality.' },
  { facultyUsername: 'shalini.nair', code: 'QAE402', title: 'Test Automation Practices', description: 'Automating reliable checks across software delivery.' },
];

function getFacultyByUsername(username) {
  return db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.username
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'faculty' AND u.username = ?
  `).get(username);
}

function courseCountForFaculty(facultyId) {
  return db.prepare('SELECT COUNT(*) AS count FROM courses WHERE faculty_id = ?').get(facultyId).count;
}

function stableFacultyCode(username) {
  const value = Array.from(username).reduce((total, character) => total + character.charCodeAt(0), 0) % 10000;
  return String(value).padStart(4, '0');
}

function createFallbackCourse(faculty, ordinal) {
  const codePrefix = `FAC${stableFacultyCode(faculty.username)}`;
  let suffix = ordinal;

  while (suffix < ordinal + 100) {
    const code = `${codePrefix}${suffix}`;
    const existing = db.prepare('SELECT id, faculty_id FROM courses WHERE code = ?').get(code);

    if (!existing) {
      createCourse({
        title: `Applied Computing Studio ${ordinal}`,
        description: `A permanent applied computing course for ${faculty.first_name} ${faculty.last_name}.`,
        code,
        credits: 3,
        status: 'published',
        facultyId: faculty.id,
      });
      return true;
    }

    if (Number(existing.faculty_id) === Number(faculty.id)) {
      return false;
    }

    suffix += 1;
  }

  throw new Error(`Could not allocate a stable course code for ${faculty.username}.`);
}

function seedFacultyCourses() {
  let inserted = 0;
  let skipped = 0;
  const findCourseByCode = db.prepare('SELECT id FROM courses WHERE code = ?');

  for (const course of demoCourses) {
    const faculty = getFacultyByUsername(course.facultyUsername);
    if (!faculty || findCourseByCode.get(course.code)) {
      skipped += 1;
      continue;
    }

    createCourse({ ...course, credits: 3, status: 'published', facultyId: faculty.id });
    inserted += 1;
  }

  const faculty = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.username
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'faculty'
    ORDER BY u.id
  `).all();

  for (const member of faculty) {
    let ownedCourses = courseCountForFaculty(member.id);
    let ordinal = 1;

    while (ownedCourses < 2) {
      if (createFallbackCourse(member, ordinal)) {
        inserted += 1;
      } else {
        skipped += 1;
      }
      ownedCourses = courseCountForFaculty(member.id);
      ordinal += 1;
    }
  }

  return { inserted, skipped };
}

function removeLegacyCorsFaculty() {
  const legacyFaculty = db.prepare(`
    SELECT u.id
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.username = 'corsfaculty2'
      AND u.email = 'corsfaculty2@example.com'
      AND u.first_name = 'CORS'
      AND u.last_name = 'Faculty'
      AND r.name = 'faculty'
  `).get();
  const replacementFaculty = getFacultyByUsername('asha.verma');

  if (!legacyFaculty || !replacementFaculty) {
    return 0;
  }

  const courses = db.prepare('SELECT id, code, title FROM courses WHERE faculty_id = ?').all(legacyFaculty.id);
  const generatedCoursesOnly = courses.length > 0 && courses.every((course) => (
    course.code.startsWith('FAC1249') && /^Applied Computing Studio \d+$/.test(course.title)
  ));
  const userActivity = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM enrollments WHERE user_id = ?) +
      (SELECT COUNT(*) FROM submissions WHERE user_id = ?) +
      (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = ?) +
      (SELECT COUNT(*) FROM results WHERE user_id = ?) +
      (SELECT COUNT(*) FROM progress WHERE user_id = ?) +
      (SELECT COUNT(*) FROM lesson_completions WHERE user_id = ?) +
      (SELECT COUNT(*) FROM announcements WHERE user_id = ?) AS count
  `).get(...Array(7).fill(legacyFaculty.id)).count;

  if (!generatedCoursesOnly || userActivity > 0) {
    return 0;
  }

  return db.transaction(() => {
    db.prepare('UPDATE courses SET faculty_id = ?, updated_at = CURRENT_TIMESTAMP WHERE faculty_id = ?')
      .run(replacementFaculty.id, legacyFaculty.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(legacyFaculty.id);
    return courses.length;
  })();
}

function seedEnrollments() {
  const students = db.prepare(`
    SELECT u.id
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'student'
    ORDER BY u.id
  `).all();
  const courses = db.prepare('SELECT id FROM courses ORDER BY id').all();

  if (!students.length || !courses.length) {
    return 0;
  }

  const insertEnrollment = db.prepare(`
    INSERT OR IGNORE INTO enrollments (user_id, course_id, status)
    VALUES (?, ?, 'active')
  `);
  const rosterSize = Math.min(6, students.length);

  return db.transaction(() => {
    let inserted = 0;

    courses.forEach((course, courseIndex) => {
      for (let offset = 0; offset < rosterSize; offset += 1) {
        const student = students[(courseIndex * 5 + offset) % students.length];
        inserted += insertEnrollment.run(student.id, course.id).changes;
      }
    });

    return inserted;
  })();
}

function getTotals() {
  const counts = db.prepare(`
    SELECT r.name AS role, COUNT(*) AS count
    FROM users u
    JOIN roles r ON r.id = u.role_id
    GROUP BY r.name
  `).all();
  const countByRole = Object.fromEntries(counts.map(({ role, count }) => [role, count]));

  return {
    students: countByRole.student || 0,
    faculty: countByRole.faculty || 0,
    courses: db.prepare('SELECT COUNT(*) AS count FROM courses').get().count,
    enrollments: db.prepare('SELECT COUNT(*) AS count FROM enrollments').get().count,
  };
}

export async function seedFullDemoData() {
  seedRoles();
  const passwordHash = await bcrypt.hash('1234', 10);
  const findExistingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?');
  const adminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('admin');

  const adminRecord = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)').get('Admin', 'admin@cloudlms.local');
  if (!adminRecord) {
    db.prepare(`
      INSERT INTO users (first_name, last_name, email, username, password_hash, role_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Admin', 'Administrator', 'admin@cloudlms.local', 'Admin', await bcrypt.hash('admin@123', 10), adminRole.id);
  } else if (adminRecord.username !== 'Admin' || adminRecord.email.toLowerCase() !== 'admin@cloudlms.local' || !(await bcrypt.compare('admin@123', adminRecord.password_hash))) {
    db.prepare(`
      UPDATE users
      SET first_name = ?, last_name = ?, email = ?, username = ?, password_hash = ?, role_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run('Admin', 'Administrator', 'admin@cloudlms.local', 'Admin', await bcrypt.hash('admin@123', 10), adminRole.id, adminRecord.id);
  }

  let facultyInserted = 0;
  let facultySkipped = 0;
  for (const faculty of demoFaculty) {
    const existingFaculty = findExistingUser.get(faculty.username, faculty.email);
    if (existingFaculty) {
      const roleId = db.prepare('SELECT id FROM roles WHERE name = ?').get('faculty').id;
      db.prepare(`
        UPDATE users
        SET first_name = ?, last_name = ?, age = ?, email = ?, username = ?, password_hash = ?, role_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(faculty.firstName, faculty.lastName, faculty.age, faculty.email, faculty.username, passwordHash, roleId, existingFaculty.id);
      facultySkipped += 1;
      continue;
    }

    createUser({ ...faculty, passwordHash, role: 'faculty' });
    facultyInserted += 1;
  }

  const legacyFacultyCoursesReassigned = removeLegacyCorsFaculty();
  const studentResult = await seedDemoStudents();
  const courseResult = seedFacultyCourses();
  const enrollmentsInserted = seedEnrollments();

  return {
    facultyInserted,
    facultySkipped,
    legacyFacultyCoursesReassigned,
    studentsInserted: studentResult.inserted,
    studentsSkipped: studentResult.skipped,
    coursesInserted: courseResult.inserted,
    coursesSkipped: courseResult.skipped,
    enrollmentsInserted,
    totals: getTotals(),
  };
}

if (process.argv[1]?.endsWith('seedDemoData.js')) {
  const result = await seedFullDemoData();
  console.log(`Seeded faculty: ${result.facultyInserted} inserted, ${result.facultySkipped} already present.`);
  if (result.legacyFacultyCoursesReassigned) {
    console.log(`Reassigned ${result.legacyFacultyCoursesReassigned} legacy debug courses without removing enrollments.`);
  }
  console.log(`Seeded students: ${result.studentsInserted} inserted, ${result.studentsSkipped} already present.`);
  console.log(`Seeded courses: ${result.coursesInserted} inserted, ${result.coursesSkipped} already present.`);
  console.log(`Seeded enrollments: ${result.enrollmentsInserted} inserted.`);
  console.log(`Current totals — students: ${result.totals.students}, faculty: ${result.totals.faculty}, courses: ${result.totals.courses}, enrollments: ${result.totals.enrollments}.`);
}
