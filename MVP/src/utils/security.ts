import { adminEmails } from '../config/auth';

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

export const hashPassword = async (password: string) => {
  try {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    return arrayBufferToBase64(buffer);
  } catch (error) {
    console.warn('Falha ao usar crypto.subtle, aplicando fallback.', error);
    return btoa(password);
  }
};

export const verifyPasswordHash = async (password: string, hash: string) => {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
};

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const isAdminEmail = (email: string) => {
  const normalized = normalizeEmail(email);
  return adminEmails.some(
    (allowed) => normalizeEmail(allowed) === normalized,
  );
};
