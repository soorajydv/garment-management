import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env';
import { badRequest } from './http';

export const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf', '.ai', '.eps', '.svg', '.psd', '.cdr'];
const INLINE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];

fs.mkdirSync(env.uploadDir, { recursive: true });

export const upload = multer({
  storage: multer.diskStorage({
    destination: env.uploadDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: env.maxUploadBytes, files: 12 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      cb(badRequest(`File type ${ext || 'unknown'} is not allowed`));
      return;
    }
    cb(null, true);
  },
});

/** Safe absolute path for a stored file name (prevents path traversal). */
export function storedFilePath(storedName: string): string {
  const base = path.basename(storedName);
  return path.join(env.uploadDir, base);
}

/** Only render known-safe types inline; everything else (incl. SVG) downloads. */
export function isInlineSafe(mimeType: string) {
  return INLINE_MIME.includes(mimeType);
}

export function removeUploadedFiles(files: Express.Multer.File[] | undefined) {
  for (const f of files ?? []) fs.promises.unlink(f.path).catch(() => undefined);
}
