import { apiFetch } from './api';
import type { AuthUser, Role } from '../types';

type AuthResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
};

type LocalUser = {
  id: string;
  nome: string;
  email: string;
  password: string;
  role: Role;
};

type TokenEntry = { token: string; userId: string };

const USERS_KEY = 'catalog-local-users';
const TOKENS_KEY = 'catalog-local-tokens';

const mapUser = (user: AuthResponse['user']): AuthUser => ({
  id: user.id,
  nome: user.name,
  email: user.email,
  role: user.role,
  isAdmin: user.role === 'ADMIN',
});

const readLocal = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore persistence errors
  }
};

const ensureSeedUser = () => {
  const users = readLocal<LocalUser[]>(USERS_KEY, []);
  if (users.length === 0) {
    users.push({
      id: 'local-admin',
      nome: 'Admin Duo',
      email: 'admin@duo.com',
      password: '123456',
      role: 'ADMIN',
    });
    writeLocal(USERS_KEY, users);
  }
};

const createToken = (userId: string) => {
  const tokens = readLocal<TokenEntry[]>(TOKENS_KEY, []).filter((t) => t.userId !== userId);
  const token = `local-${userId}-${Date.now()}`;
  tokens.push({ token, userId });
  writeLocal(TOKENS_KEY, tokens);
  return token;
};

export const loginUser = async (payload: {
  email: string;
  password: string;
}) => {
  try {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: payload,
    });
    return { token: data.token, user: mapUser(data.user) };
  } catch (error) {
    ensureSeedUser();
    const users = readLocal<LocalUser[]>(USERS_KEY, []);
    const user = users.find(
      (u) => u.email.toLowerCase() === payload.email.toLowerCase() && u.password === payload.password,
    );
    if (!user) {
      throw new Error((error as Error).message || 'Credenciais inválidas.');
    }
    const token = createToken(user.id);
    return { token, user };
  }
};

export const registerUser = async (payload: {
  nome: string;
  email: string;
  password: string;
}) => {
  try {
    const data = await apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: { name: payload.nome, email: payload.email, password: payload.password },
    });
    return { token: data.token, user: mapUser(data.user) };
  } catch (error) {
    ensureSeedUser();
    const users = readLocal<LocalUser[]>(USERS_KEY, []);
    const exists = users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase());
    if (exists) {
      throw new Error('Email já cadastrado.');
    }
    const newUser: LocalUser = {
      id: `local-${Date.now()}`,
      nome: payload.nome,
      email: payload.email,
      password: payload.password,
      role: 'CLIENT',
    };
    users.push(newUser);
    writeLocal(USERS_KEY, users);
    const token = createToken(newUser.id);
    return { token, user: newUser };
  }
};

export const fetchMe = async (token: string) => {
  try {
    const data = await apiFetch<{ user: { id: string; name: string; email: string; role: Role } }>(
      '/api/auth/me',
      {
        token,
      },
    );
    return mapUser(data.user);
  } catch {
    ensureSeedUser();
    const tokens = readLocal<TokenEntry[]>(TOKENS_KEY, []);
    const match = tokens.find((t) => t.token === token);
    if (!match) {
      throw new Error('Token inválido');
    }
    const users = readLocal<LocalUser[]>(USERS_KEY, []);
    const user = users.find((u) => u.id === match.userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      isAdmin: user.role === 'ADMIN',
    };
  }
};
