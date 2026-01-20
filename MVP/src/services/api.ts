// Cliente base para chamadas HTTP.
const normalizeBase = (value: string) => value.replace(/\/+$/, '');

const resolveApiBase = () => {
  const env = (import.meta.env.VITE_API_URL ?? '').trim();
  if (env) return normalizeBase(env);
  if (typeof window === 'undefined') return '';
  return normalizeBase(window.location.pathname.startsWith('/efish') ? '/efish' : '');
};

const API_BASE = resolveApiBase();

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

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
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Erro na requisicao (${response.status})`;
    if (text) {
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed && parsed.message) {
          message = parsed.message;
        }
      } catch {
        // ignore JSON parse errors
      }
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
};
