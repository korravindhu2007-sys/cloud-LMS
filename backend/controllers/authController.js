import { registerUser, loginUser } from '../services/authService.js';
import { getUserById, getUsersByRole } from '../models/userModel.js';
import { validateRegistrationInput, validateLoginInput } from '../validation/validators.js';

export async function register(req, res, next) {
  try {
    validateRegistrationInput(req.body);
    const result = await registerUser({ ...req.body, role: 'student' });
    return res.status(201).json({ success: true, user: result.user });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    validateLoginInput(req.body);
    const result = await loginUser(req.body);
    return res.json({ success: true, token: result.token, user: result.user });
  } catch (error) {
    return next(error);
  }
}

export function logout(req, res) {
  return res.json({ success: true, message: 'User logged out successfully.' });
}

export function me(req, res) {
  const user = getUserById(req.user.id);
  return res.json({ success: true, user: { ...user, role: user.role_name } });
}

export function listFacultyLoginOptions(req, res) {
  const facultyUsers = getUsersByRole('faculty').map((user) => ({
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    username: user.username,
    role_name: user.role_name,
  }));

  return res.json({ success: true, users: facultyUsers });
}
