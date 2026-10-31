import 'dotenv/config';
import path from 'path';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') throw new Error(`Missing required environment variable ${name}`);
  return value;
}

const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('change-me'))) {
  throw new Error('JWT_SECRET must be set to a strong value in production');
}

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 4000),
  appUrl: (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/ss_textiles'),
  jwtSecret: required('JWT_SECRET', 'dev-only-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean),
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? './uploads'),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 15) * 1024 * 1024,
  smtpHost: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT ?? 465),
  smtpSecure: (process.env.SMTP_SECURE ?? 'true') === 'true',
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  mailFrom: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? '',
};
