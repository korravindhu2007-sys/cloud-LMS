import multer from 'multer';
import { isAllowedCourseUpload } from '../services/courseUploadService.js';

const parseCourseUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!isAllowedCourseUpload(file.originalname, file.mimetype)) {
      callback(Object.assign(new Error('Unsupported file type.'), { statusCode: 400 }));
      return;
    }
    callback(null, true);
  },
}).single('file');

export function uploadCourseMaterial(req, res, next) {
  parseCourseUpload(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        error.statusCode = 413;
        error.message = 'Files must be 15 MB or smaller.';
      } else if (!error.statusCode) {
        error.statusCode = 400;
      }
      return next(error);
    }
    return next();
  });
}