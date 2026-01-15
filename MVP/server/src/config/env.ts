import 'dotenv/config';
import path from 'node:path';

const required = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const toNumber = (value: string, key: string) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
};

export const env = {
  port: toNumber(required('PORT', '4000'), 'PORT'),
  jwtSecret: required('JWT_SECRET', 'change-me'),
  adminEmails: required('ADMIN_EMAILS', '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean),
  dataFile: path.resolve(process.cwd(), required('DATA_FILE', './data/database.json')),
};
