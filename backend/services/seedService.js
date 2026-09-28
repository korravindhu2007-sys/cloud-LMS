import bcrypt from 'bcryptjs';
import { getDatabase } from '../config/db.js';
import { getRoleByName } from '../models/userModel.js';

const db = getDatabase();

const defaultRoles = ['student', 'faculty', 'admin'];

export function seedRoles() {
  for (const role of defaultRoles) {
    const existing = getRoleByName(role);
    if (!existing) {
      db.prepare('INSERT INTO roles (name) VALUES (?)').run(role);
    }
  }
}

export async function seedDemoData() {
  seedRoles();

  const adminRole = getRoleByName('admin');
  const facultyRole = getRoleByName('faculty');
  const studentRole = getRoleByName('student');

  const adminRecord = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)').get('Admin', 'admin@cloudlms.local');
  const adminPasswordHash = await bcrypt.hash('admin@123', 10);

  if (!adminRecord) {
    db.prepare(`
      INSERT INTO users (first_name, last_name, email, username, password_hash, role_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Admin', 'Administrator', 'admin@cloudlms.local', 'Admin', adminPasswordHash, adminRole.id);
  } else {
    const needsAdminNormalization = adminRecord.username !== 'Admin' || adminRecord.email.toLowerCase() !== 'admin@cloudlms.local' || adminRecord.password_hash !== adminPasswordHash;
    if (needsAdminNormalization) {
      db.prepare(`
        UPDATE users
        SET first_name = ?, last_name = ?, email = ?, username = ?, password_hash = ?, role_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run('Admin', 'Administrator', 'admin@cloudlms.local', 'Admin', adminPasswordHash, adminRole.id, adminRecord.id);
    }
  }

  const facultyDefaults = [
    { firstName: 'Dr. K.', lastName: 'Vara Prasada Rao', age: 47, email: 'faculty1@cloudlms.local', username: 'faculty1' },
    { firstName: 'Anuj', lastName: 'Kapoor', age: 39, email: 'anuj.kapoor@cloudlms.local', username: 'anuj.kapoor' },
  ];
  const facultyPasswordHash = await bcrypt.hash('1234', 10);

  for (const faculty of facultyDefaults) {
    const existingFaculty = db.prepare('SELECT id FROM users WHERE username = ?').get(faculty.username);
    if (!existingFaculty) {
      db.prepare(`
        INSERT INTO users (first_name, last_name, age, email, username, password_hash, role_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(faculty.firstName, faculty.lastName, faculty.age, faculty.email, faculty.username, facultyPasswordHash, facultyRole.id);
    } else {
      db.prepare(`
        UPDATE users
        SET first_name = ?, last_name = ?, age = ?, email = ?, password_hash = ?, role_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(faculty.firstName, faculty.lastName, faculty.age, faculty.email, facultyPasswordHash, facultyRole.id, existingFaculty.id);
    }
  }

  const studentAExists = db.prepare('SELECT id FROM users WHERE username = ?').get('student1');
  if (!studentAExists) {
    db.prepare(`
      INSERT INTO users (first_name, last_name, email, username, password_hash, role_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Balu', 'D.', 'student1@cloudlms.local', 'student1', await bcrypt.hash('StudentPass123!', 10), studentRole.id);
  }

  const studentBExists = db.prepare('SELECT id FROM users WHERE username = ?').get('student2');
  if (!studentBExists) {
    db.prepare(`
      INSERT INTO users (first_name, last_name, email, username, password_hash, role_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Pavan', 'Y.', 'student2@cloudlms.local', 'student2', await bcrypt.hash('StudentPass123!', 10), studentRole.id);
  }

  const facultyUser = db.prepare('SELECT id FROM users WHERE username = ?').get('faculty1');
  const demoFacultyUser = db.prepare('SELECT id FROM users WHERE username = ?').get('anuj.kapoor');

  const course1Exists = db.prepare('SELECT id FROM courses WHERE code = ?').get('CLOUD101');
  if (!course1Exists && facultyUser) {
    const courseResult = db.prepare(`
      INSERT INTO courses (title, description, code, credits, status, faculty_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Cloud Computing Fundamentals', 'Foundations of cloud computing and deployment patterns.', 'CLOUD101', 3, 'published', facultyUser.id);

    const module1Id = db.prepare('INSERT INTO modules (course_id, title, description) VALUES (?, ?, ?)').run(courseResult.lastInsertRowid, 'Introduction to Cloud', 'Overview of cloud concepts').lastInsertRowid;
    db.prepare('INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)').run(module1Id, 'What is cloud computing?', 'Cloud computing is the on-demand delivery of IT resources over the internet.', 1);
    db.prepare('INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)').run(module1Id, 'Cloud deployment models', 'Compare public, private, hybrid, and multi-cloud strategies.', 2);

    const module2Id = db.prepare('INSERT INTO modules (course_id, title, description) VALUES (?, ?, ?)').run(courseResult.lastInsertRowid, 'Scaling and Resilience', 'Patterns for dependable platform operations').lastInsertRowid;
    db.prepare('INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)').run(module2Id, 'Elasticity and load balancing', 'Use automation and orchestration to scale capacity reliably.', 1);
    db.prepare('INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)').run(module2Id, 'Disaster recovery basics', 'Define backup, failover, and recovery objectives.', 2);

    db.prepare('INSERT INTO announcements (course_id, title, content) VALUES (?, ?, ?)').run(courseResult.lastInsertRowid, 'Welcome to Cloud Computing', 'Your cloud fundamentals course is now live.');
  }

  const facultyCourseExists = db.prepare('SELECT id FROM courses WHERE code = ?').get('CNE401');
  if (!facultyCourseExists && demoFacultyUser) {
    const courseResult = db.prepare(`
      INSERT INTO courses (title, description, code, credits, status, faculty_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Cloud Native Engineering', 'Designing and operating cloud-native systems.', 'CNE401', 3, 'published', demoFacultyUser.id);

    const moduleId = db.prepare('INSERT INTO modules (course_id, title, description) VALUES (?, ?, ?)').run(courseResult.lastInsertRowid, 'Cloud Foundations', 'Core cloud-native learning path').lastInsertRowid;
    db.prepare('INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)').run(moduleId, 'Introduction to cloud-native architecture', 'Cloud-native applications are designed for resilience, scale, and automation.', 1);
    db.prepare('INSERT INTO announcements (course_id, title, content) VALUES (?, ?, ?)').run(courseResult.lastInsertRowid, 'New cloud-native course', 'This course is now ready for enrollment.');
  }

  const course2Exists = db.prepare('SELECT id FROM courses WHERE code = ?').get('DSA201');
  if (!course2Exists && facultyUser) {
    const courseResult = db.prepare(`
      INSERT INTO courses (title, description, code, credits, status, faculty_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Data Structures and Algorithms', 'Core algorithmic thinking and structured problem solving.', 'DSA201', 3, 'published', facultyUser.id);

    const module1Id = db.prepare('INSERT INTO modules (course_id, title, description) VALUES (?, ?, ?)').run(courseResult.lastInsertRowid, 'Algorithmic Thinking', 'Structuring repeated work and problem decomposition').lastInsertRowid;
    db.prepare('INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)').run(module1Id, 'Complexity basics', 'Measure algorithmic efficiency using time and space trade-offs.', 1);
    db.prepare('INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)').run(module1Id, 'Searching techniques', 'Compare linear and binary search strategies.', 2);

    const module2Id = db.prepare('INSERT INTO modules (course_id, title, description) VALUES (?, ?, ?)').run(courseResult.lastInsertRowid, 'Trees and Graphs', 'Understand connected structures and traversal patterns').lastInsertRowid;
    db.prepare('INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)').run(module2Id, 'Tree traversal', 'Walk a tree using depth-first and breadth-first methods.', 1);

    db.prepare('INSERT INTO announcements (course_id, title, content) VALUES (?, ?, ?)').run(courseResult.lastInsertRowid, 'Assignment update', 'The algorithmic complexity quiz has been rescheduled.');
  }

  const course3Exists = db.prepare('SELECT id FROM courses WHERE code = ?').get('SE301');
  if (!course3Exists && facultyUser) {
    const courseResult = db.prepare(`
      INSERT INTO courses (title, description, code, credits, status, faculty_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Software Engineering Essentials', 'Modern software delivery practices for collaborative teams.', 'SE301', 3, 'published', facultyUser.id);

    const module1Id = db.prepare('INSERT INTO modules (course_id, title, description) VALUES (?, ?, ?)').run(courseResult.lastInsertRowid, 'Requirements and Design', 'Clarifying needs and shaping solutions').lastInsertRowid;
    db.prepare('INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)').run(module1Id, 'Requirement gathering', 'Capture stakeholder expectations and constraints.', 1);
    db.prepare('INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)').run(module1Id, 'Design thinking', 'Translate requirements into practical design decisions.', 2);

    const module2Id = db.prepare('INSERT INTO modules (course_id, title, description) VALUES (?, ?, ?)').run(courseResult.lastInsertRowid, 'Quality and Delivery', 'Automated checks and reliable release practices').lastInsertRowid;
    db.prepare('INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)').run(module2Id, 'Testing strategies', 'Balance unit, integration, and acceptance coverage.', 1);
  }
}
