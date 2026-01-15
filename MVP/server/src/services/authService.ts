import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { readDatabase, updateDatabase } from '../data/database';
import type { Role, UserRecord } from '../types';
import { generateId, normalizeEmail, nowIso } from '../utils/helpers';

type TokenPayload = {
  sub: string;
  role: Role;
};

const TOKEN_EXPIRATION = '12h';

export type AuthResponse = {
  token: string;
  user: Omit<UserRecord, 'passwordHash'>;
};

const sanitizeUser = ({
  passwordHash,
  ...user
}: UserRecord): Omit<UserRecord, 'passwordHash'> => user;

const determineRole = (email: string): Role =>
  env.adminEmails.includes(normalizeEmail(email)) ? 'ADMIN' : 'CLIENT';

export const registerUser = async ({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  const normalizedEmail = normalizeEmail(email);
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await updateDatabase((db) => {
    if (db.users.some((entry) => entry.email === normalizedEmail)) {
      throw new Error('E-mail já cadastrado.');
    }
    const role = determineRole(normalizedEmail);
    const now = nowIso();
    const newUser: UserRecord = {
      id: generateId(),
      name,
      email: normalizedEmail,
      passwordHash: hashedPassword,
      role,
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(newUser);
    return newUser;
  });

  return {
    token: createToken(user),
    user: sanitizeUser(user),
  };
};

export const loginUser = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  const normalizedEmail = normalizeEmail(email);
  const db = await readDatabase();
  const user = db.users.find((entry) => entry.email === normalizedEmail);
  if (!user) {
    throw new Error('Credenciais inválidas.');
  }
  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new Error('Credenciais inválidas.');
  }

  return {
    token: createToken(user),
    user: sanitizeUser(user),
  };
};

const createToken = (user: UserRecord) => {
  const payload: TokenPayload = { sub: user.id, role: user.role };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: TOKEN_EXPIRATION });
};

export const verifyToken = (token: string): TokenPayload => {
  const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload & {
    role?: Role;
  };
  const sub = payload.sub;
  if (!sub || typeof sub !== 'string') {
    throw new Error('Token inválido.');
  }
  const role = payload.role;
  if (role !== 'ADMIN' && role !== 'CLIENT') {
    throw new Error('Token sem role.');
  }
  return { sub, role };
};

export const getUserById = async (id: string) => {
  const db = await readDatabase();
  return db.users.find((user) => user.id === id) ?? null;
};
