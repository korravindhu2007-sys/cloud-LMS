import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
export const courseUploadDirectory = path.resolve(
  serviceDirectory,
  '..',
  process.env.NODE_ENV === 'test' ? 'data/uploads.test' : 'uploads',
);

export const allowedCourseUploads = {
  '.pdf': new Set(['application/pdf']),
  '.doc': new Set(['application/msword', 'application/octet-stream']),
  '.docx': new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream']),
  '.ppt': new Set(['application/vnd.ms-powerpoint', 'application/octet-stream']),
  '.pptx': new Set(['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/octet-stream']),
  '.txt': new Set(['text/plain', 'application/octet-stream']),
  '.md': new Set(['text/markdown', 'text/plain', 'application/octet-stream']),
  '.png': new Set(['image/png']),
  '.jpg': new Set(['image/jpeg']),
  '.jpeg': new Set(['image/jpeg']),
  '.webp': new Set(['image/webp']),
  '.mp4': new Set(['video/mp4']),
  '.webm': new Set(['video/webm']),
};

export function isAllowedCourseUpload(originalName, mimeType) {
  const extension = path.extname(String(originalName || '')).toLowerCase();
  return allowedCourseUploads[extension]?.has(String(mimeType || '').toLowerCase()) || false;
}

function hasValidFileSignature(extension, buffer) {
  if (!Buffer.isBuffer(buffer)) return false;
  if (extension === '.pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (extension === '.png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (extension === '.jpg' || extension === '.jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === '.webp') return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (extension === '.mp4') return buffer.toString('ascii', 4, 8) === 'ftyp';
  if (extension === '.webm') return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (extension === '.doc' || extension === '.ppt') return buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (extension === '.docx' || extension === '.pptx') return buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (extension === '.txt' || extension === '.md') return !buffer.includes(0);
  return false;
}

function courseDirectory(courseId) {
  const normalizedId = Number(courseId);
  if (!Number.isInteger(normalizedId) || normalizedId < 1) {
    throw Object.assign(new Error('Invalid course id.'), { statusCode: 400 });
  }
  return path.join(courseUploadDirectory, String(normalizedId));
}

export async function storeCourseUpload(courseId, file) {
  const extension = path.extname(String(file?.originalname || '')).toLowerCase();
  if (!isAllowedCourseUpload(file?.originalname, file?.mimetype) || !hasValidFileSignature(extension, file?.buffer)) {
    throw Object.assign(new Error('File content does not match a supported document, image, or video type.'), { statusCode: 400 });
  }

  const directory = courseDirectory(courseId);
  await fs.mkdir(directory, { recursive: true });
  const fileName = `${randomUUID()}${extension}`;
  const destination = path.resolve(directory, fileName);
  if (!destination.startsWith(`${directory}${path.sep}`)) {
    throw Object.assign(new Error('Invalid upload path.'), { statusCode: 400 });
  }

  await fs.writeFile(destination, file.buffer, { flag: 'wx' });
  return `upload:${Number(courseId)}/${fileName}`;
}

export function resolveCourseUpload(storageKey) {
  const value = String(storageKey || '');
  if (!value.startsWith('upload:')) return null;

  const relativePath = value.slice('upload:'.length).replaceAll('\\', '/');
  const segments = relativePath.split('/');
  if (segments.length !== 2 || !/^\d+$/.test(segments[0]) || path.basename(segments[1]) !== segments[1]) {
    return null;
  }

  const destination = path.resolve(courseUploadDirectory, segments[0], segments[1]);
  return destination.startsWith(`${courseUploadDirectory}${path.sep}`) ? destination : null;
}

export async function removeCourseUpload(storageKey) {
  const destination = resolveCourseUpload(storageKey);
  if (destination) await fs.rm(destination, { force: true });
}

export async function writeGeneratedCourseGuide(courseId, content) {
  const directory = courseDirectory(courseId);
  await fs.mkdir(directory, { recursive: true });
  const fileName = 'course-field-guide.md';
  await fs.writeFile(path.join(directory, fileName), String(content), 'utf8');
  return `upload:${Number(courseId)}/${fileName}`;
}