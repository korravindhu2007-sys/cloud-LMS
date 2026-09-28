import jwt from 'jsonwebtoken';
import { getUserById } from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'development_secret_change_me';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = getUserById(decoded.sub);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    req.user = {
      id: user.id,
      role: user.role_name,
      email: user.email,
      username: user.username,
    };

    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

export function requireAuth(req, res, next) {
  return authenticateToken(req, res, next);
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to access this resource.' });
    }

    return next();
  };
}

export const requireStudent = requireRole('student');
export const requireFaculty = requireRole('faculty', 'admin');
export const requireAdmin = requireRole('admin');
