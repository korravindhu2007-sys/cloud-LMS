import bcrypt from 'bcryptjs';
import { getDatabase } from './config/db.js';
import { getRoleByName } from './models/userModel.js';
import { seedRoles } from './services/seedService.js';

const db = getDatabase();

export const demoStudents = [
  ['Aarav', 'Mehta', 'aarav.mehta', 'aarav.mehta@cloudlms.local'],
  ['Aditi', 'Sharma', 'aditi.sharma', 'aditi.sharma@cloudlms.local'],
  ['Ananya', 'Reddy', 'ananya.reddy', 'ananya.reddy@cloudlms.local'],
  ['Arjun', 'Nair', 'arjun.nair', 'arjun.nair@cloudlms.local'],
  ['Bhavya', 'Iyer', 'bhavya.iyer', 'bhavya.iyer@cloudlms.local'],
  ['Dev', 'Malhotra', 'dev.malhotra', 'dev.malhotra@cloudlms.local'],
  ['Diya', 'Kapoor', 'diya.kapoor', 'diya.kapoor@cloudlms.local'],
  ['Gautam', 'Bose', 'gautam.bose', 'gautam.bose@cloudlms.local'],
  ['Harini', 'Rao', 'harini.rao', 'harini.rao@cloudlms.local'],
  ['Ishaan', 'Verma', 'ishaan.verma', 'ishaan.verma@cloudlms.local'],
  ['Jahnavi', 'Kulkarni', 'jahnavi.kulkarni', 'jahnavi.kulkarni@cloudlms.local'],
  ['Karthik', 'Menon', 'karthik.menon', 'karthik.menon@cloudlms.local'],
  ['Kavya', 'Singh', 'kavya.singh', 'kavya.singh@cloudlms.local'],
  ['Manav', 'Joshi', 'manav.joshi', 'manav.joshi@cloudlms.local'],
  ['Meera', 'Patel', 'meera.patel', 'meera.patel@cloudlms.local'],
  ['Nikhil', 'Gupta', 'nikhil.gupta', 'nikhil.gupta@cloudlms.local'],
  ['Nisha', 'Bhat', 'nisha.bhat', 'nisha.bhat@cloudlms.local'],
  ['Pooja', 'Desai', 'pooja.desai', 'pooja.desai@cloudlms.local'],
  ['Pranav', 'Saxena', 'pranav.saxena', 'pranav.saxena@cloudlms.local'],
  ['Priya', 'Choudhary', 'priya.choudhary', 'priya.choudhary@cloudlms.local'],
  ['Rahul', 'Krishnan', 'rahul.krishnan', 'rahul.krishnan@cloudlms.local'],
  ['Rhea', 'Mishra', 'rhea.mishra', 'rhea.mishra@cloudlms.local'],
  ['Rohan', 'Shetty', 'rohan.shetty', 'rohan.shetty@cloudlms.local'],
  ['Saanvi', 'Agarwal', 'saanvi.agarwal', 'saanvi.agarwal@cloudlms.local'],
  ['Sameer', 'Khan', 'sameer.khan', 'sameer.khan@cloudlms.local'],
  ['Shreya', 'Pillai', 'shreya.pillai', 'shreya.pillai@cloudlms.local'],
  ['Tanvi', 'Ghosh', 'tanvi.ghosh', 'tanvi.ghosh@cloudlms.local'],
  ['Varun', 'Srinivas', 'varun.srinivas', 'varun.srinivas@cloudlms.local'],
  ['Vidya', 'Raman', 'vidya.raman', 'vidya.raman@cloudlms.local'],
  ['Yash', 'Trivedi', 'yash.trivedi', 'yash.trivedi@cloudlms.local'],
];

export async function seedDemoStudents() {
  seedRoles();

  const studentRole = getRoleByName('student');
  if (!studentRole) {
    throw new Error('Student role could not be created.');
  }

  const passwordHash = await bcrypt.hash('1234', 10);
  const findExisting = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?');
  const insertStudent = db.prepare(`
    INSERT INTO users (first_name, last_name, email, username, password_hash, role_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = db.transaction(() => {
    let inserted = 0;
    let skipped = 0;

    for (const [firstName, lastName, username, email] of demoStudents) {
      if (findExisting.get(username, email)) {
        skipped += 1;
        continue;
      }

      insertStudent.run(firstName, lastName, email, username, passwordHash, studentRole.id);
      inserted += 1;
    }

    const courseIds = db.prepare(`
      SELECT id
      FROM courses
      WHERE code IN ('CNE401', 'CLOUD101', 'DSA201', 'SE301')
    `).all();
    const studentIds = db.prepare(`
      SELECT id
      FROM users
      WHERE role_id = ?
      ORDER BY id ASC
    `).all(studentRole.id);
    const enrollStudent = db.prepare(`
      INSERT OR IGNORE INTO enrollments (user_id, course_id, status)
      VALUES (?, ?, 'active')
    `);

    for (const course of courseIds) {
      for (const student of studentIds.slice(0, 6)) {
        enrollStudent.run(student.id, course.id);
      }
    }

    const counts = db.prepare(`
      SELECT r.name AS role, COUNT(*) AS count
      FROM users u
      JOIN roles r ON r.id = u.role_id
      GROUP BY r.name
    `).all();
    const courses = db.prepare('SELECT COUNT(*) AS count FROM courses').get().count;

    return { inserted, skipped, counts, courses };
  })();

  return result;
}

if (process.argv[1]?.endsWith('seedStudents.js')) {
  const result = await seedDemoStudents();
  const countByRole = Object.fromEntries(result.counts.map(({ role, count }) => [role, count]));
  console.log(`Seeded students: ${result.inserted} inserted, ${result.skipped} already present.`);
  console.log(`Current totals — students: ${countByRole.student || 0}, faculty: ${countByRole.faculty || 0}, courses: ${result.courses}.`);
}
