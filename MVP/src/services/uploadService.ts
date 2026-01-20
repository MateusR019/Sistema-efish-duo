// Upload de imagens para o servidor.
import { apiFetch } from './api';

export const uploadImage = async (dataUrl: string) => {
  const data = await apiFetch<{ url: string }>('/api/uploads', {
    method: 'POST',
    body: { dataUrl },
  });
  return data.url;
};
