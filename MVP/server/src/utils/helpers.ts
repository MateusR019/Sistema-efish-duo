// Funcoes utilitarias do backend.
import { randomUUID } from 'node:crypto';

export const nowIso = () => new Date().toISOString();

export const generateId = () => randomUUID();

export const toCents = (value: number) => Math.round(value * 100);

export const fromCents = (value: number) => value / 100;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const generateOrderNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 900 + 100);
  return `ORC-${datePart}-${randomPart}`;
};
