import { getUserById, getAllUsers, getUsersByRole, updateUserProfile } from '../models/userModel.js';

export function getCurrentUser(req, res) {
  const user = getUserById(req.user.id);
  return res.json({ success: true, user: { ...user, role: user.role_name } });
}

export function updateCurrentUser(req, res) {
  const fields = {};
  if (req.body.firstName !== undefined) fields.first_name = String(req.body.firstName).trim();
  if (req.body.lastName !== undefined) fields.last_name = String(req.body.lastName).trim();
  if (req.body.email !== undefined) fields.email = String(req.body.email).trim().toLowerCase();

  if (!Object.keys(fields).length || Object.values(fields).some((value) => !value)) {
    return res.status(400).json({ success: false, message: 'Provide at least one non-empty profile field.' });
  }

  const updatedUser = updateUserProfile(req.user.id, fields);

  return res.json({ success: true, user: { ...updatedUser, role: updatedUser.role_name } });
}

export function listAllUsers(req, res) {
  return res.json({ success: true, users: getAllUsers() });
}

export function listStudents(req, res) {
  return res.json({ success: true, users: getUsersByRole('student') });
}

export function listFaculty(req, res) {
  return res.json({ success: true, users: getUsersByRole('faculty') });
}
