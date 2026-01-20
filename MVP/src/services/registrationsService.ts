// Chamadas para aprovar ou rejeitar cadastros.
import { apiFetch } from './api';

export type PendingRegistration = {
  id: string;
  nome: string;
  email: string;
  cnpj: string;
  createdAt: string;
};

type RegistrationResponse = {
  id: string;
  name: string;
  email: string;
  cnpj?: string;
  createdAt: string;
};

const mapRegistration = (item: RegistrationResponse): PendingRegistration => ({
  id: item.id,
  nome: item.name,
  email: item.email,
  cnpj: item.cnpj ?? '',
  createdAt: item.createdAt,
});

export const fetchPendingRegistrations = async () => {
  const data = await apiFetch<{ registrations: RegistrationResponse[] }>(
    '/api/admin/registrations',
  );
  return data.registrations.map(mapRegistration);
};

export const approveRegistration = async (id: string) => {
  await apiFetch(`/api/admin/registrations/${id}/approve`, { method: 'POST' });
};

export const rejectRegistration = async (id: string) => {
  await apiFetch(`/api/admin/registrations/${id}/reject`, { method: 'POST' });
};
