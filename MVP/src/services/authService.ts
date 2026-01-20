// Servicos de login, registro e sessao.
import { apiFetch } from './api';
import type { AuthUser, Role, UserStatus } from '../types';

type AuthResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    cnpj?: string;
    role: Role;
    status?: UserStatus;
  };
};

const mapUser = (user: AuthResponse['user']): AuthUser => ({
  id: user.id,
  nome: user.name,
  email: user.email,
  cnpjCpf: user.cnpj ?? '',
  role: user.role,
  isAdmin: user.role === 'ADMIN',
  status: user.status,
});

export const loginUser = async (payload: {
  email: string;
  password: string;
}) => {
  const data = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
  return { user: mapUser(data.user) };
};

export const registerUser = async (payload: {
  nome: string;
  email: string;
  password: string;
  cnpj: string;
}) => {
  const data = await apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: {
      name: payload.nome,
      email: payload.email,
      password: payload.password,
      cnpj: payload.cnpj,
    },
  });
  return { user: mapUser(data.user) };
};

export const fetchMe = async () => {
  const data = await apiFetch<{
    user: {
      id: string;
      name: string;
      email: string;
      cnpj?: string;
      role: Role;
      status?: UserStatus;
    };
  }>(
    '/api/auth/me',
  );
  return mapUser(data.user);
};

export const logoutUser = async () => {
  await apiFetch('/api/auth/logout', { method: 'POST' });
};
