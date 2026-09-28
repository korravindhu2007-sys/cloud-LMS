export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'An internal server error occurred.' : err.message;

  return res.status(statusCode).json({
    success: false,
    message,
  });
}

export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: 'The requested endpoint was not found.',
  });
}
