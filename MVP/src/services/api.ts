const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type ApiOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
};

export const apiFetch = async <T>(path: string, options: ApiOptions = {}) => {
  const { method = 'GET', token, body, headers } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Erro na requisicao (${response.status})`);
  }

  return (await response.json()) as T;
};
