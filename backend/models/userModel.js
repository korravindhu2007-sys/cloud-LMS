import { getDatabase } from '../config/db.js';

const db = getDatabase();

export function getRoleByName(name) {
  return db.prepare('SELECT * FROM roles WHERE name = ?').get(name);
}

export function getUserById(id) {
  return db.prepare(`
    SELECT u.*, r.name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = ?
  `).get(id);
}

export function getUserByUsername(username) {
  return db.prepare(`
    SELECT u.*, r.name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE LOWER(u.username) = LOWER(?)
  `).get(username);
}

export function getUserByEmail(email) {
  return db.prepare(`
    SELECT u.*, r.name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE LOWER(u.email) = LOWER(?)
  `).get(email);
}

export function createUser({ firstName, lastName, age = null, email, username, passwordHash, role }) {
  const roleRecord = getRoleByName(role);
  if (!roleRecord) {
    throw new Error(`Role '${role}' does not exist.`);
  }

  const result = db.prepare(`
    INSERT INTO users (first_name, last_name, age, email, username, password_hash, role_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(firstName, lastName, age, email.toLowerCase(), username, passwordHash, roleRecord.id);

  return getUserById(result.lastInsertRowid);
}

export function getUserCountByRole(roleName) {
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.name = ?
  `).get(roleName)?.count || 0;
}

export function getAllUsers() {
  return db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.username, r.name AS role_name, u.is_active, u.created_at
    FROM users u
    JOIN roles r ON r.id = u.role_id
    ORDER BY u.id ASC
  `).all();
}

export function updateUserProfile(userId, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) {
    return getUserById(userId);
  }

  const assignments = keys.map((key) => `${key} = ?`).join(', ');
  const values = keys.map((key) => fields[key]);

  db.prepare(`UPDATE users SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, userId);

  return getUserById(userId);
}

export function getUsersByRole(roleName) {
  return db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.username, r.name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.name = ?
    ORDER BY u.last_name ASC
  `).all(roleName);
}
