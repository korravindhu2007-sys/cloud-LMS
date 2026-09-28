export function validateRegistrationInput(payload) {
  const required = ['firstName', 'lastName', 'email', 'username', 'password'];
  for (const field of required) {
    if (!payload[field] || String(payload[field]).trim() === '') {
      throw Object.assign(new Error(`${field} is required.`), { statusCode: 400 });
    }
  }

  if (payload.role && payload.role !== 'student') {
    throw Object.assign(new Error('Public registration is available for students only.'), { statusCode: 403 });
  }

  if (payload.password.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters long.'), { statusCode: 400 });
  }

  return true;
}

export function validateLoginInput(payload) {
  if (!payload.username || !payload.password) {
    throw Object.assign(new Error('Username or email and password are required.'), { statusCode: 400 });
  }

  return true;
}

export function validateCourseInput(payload) {
  if (!payload.title || !payload.code) {
    throw Object.assign(new Error('Course title and code are required.'), { statusCode: 400 });
  }

  return true;
}
