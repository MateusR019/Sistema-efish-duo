import dayjs from 'dayjs';
import type { ClientData } from '../types';

export const formatCurrency = (value: number) =>
  value
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    .replace(/\u00a0/g, ' ');

export const formatDateTime = (value?: string | Date) => {
  if (!value) return dayjs().format('DD/MM/YYYY HH:mm');
  return dayjs(value).format('DD/MM/YYYY HH:mm');
};

export const generateOrderNumber = () =>
  `ORC-${dayjs().format('YYYYMMDD')}-${Math.floor(Math.random() * 900 + 100)}`;

export const clientIsComplete = (client: ClientData) =>
  Boolean(client.nome && client.email && client.empresa && client.telefone);

export const formatTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
