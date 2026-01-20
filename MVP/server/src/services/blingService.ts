// Integracao com o Bling (OAuth e leitura de dados).
import crypto from 'node:crypto';
import { readDatabase, updateDatabase } from '../data/database';
import type { BlingOauthState, BlingToken } from '../types';

const BLING_API_BASE = 'https://api.bling.com.br/Api/v3';
const BLING_TOKEN_URL = 'https://bling.com.br/Api/v3/oauth/token';

const getBlingConfig = () => ({
  clientId: process.env.BLING_CLIENT_ID || '',
  clientSecret: process.env.BLING_CLIENT_SECRET || '',
  redirectUri: process.env.BLING_REDIRECT_URI || '',
});

const nowIso = () => new Date().toISOString();

export const getStoredBlingToken = async (): Promise<BlingToken | null> => {
  const data = await readDatabase();
  return data.blingToken ?? null;
};

export const saveBlingToken = async (token: BlingToken) => {
  await updateDatabase((data) => {
    data.blingToken = token;
    return data;
  });
};

export const storeOauthState = async (state: string) => {
  const entry: BlingOauthState = { state, createdAt: nowIso() };
  await updateDatabase((data) => {
    const states = data.blingOauthStates ?? [];
    states.push(entry);
    data.blingOauthStates = states;
    return data;
  });
};

export const consumeOauthState = async (state: string) => {
  const data = await readDatabase();
  const states = data.blingOauthStates ?? [];
  const match = states.find((item) => item.state === state);
  if (!match) return false;
  const createdAt = Date.parse(match.createdAt);
  const isFresh = Number.isFinite(createdAt)
    ? Date.now() - createdAt < 10 * 60 * 1000
    : false;
  await updateDatabase((draft) => {
    draft.blingOauthStates = (draft.blingOauthStates ?? []).filter(
      (item) => item.state !== state,
    );
    return draft;
  });
  return isFresh;
};

export const generateOauthState = () => crypto.randomBytes(16).toString('hex');

type BlingTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
};

const exchangeBlingToken = async ({
  code,
  refreshToken,
}: {
  code?: string;
  refreshToken?: string;
}): Promise<BlingTokenResponse> => {
  const { clientId, clientSecret, redirectUri } = getBlingConfig();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Bling OAuth nao configurado.');
  }
  const params = new URLSearchParams();
  if (code) {
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('redirect_uri', redirectUri);
  } else if (refreshToken) {
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', refreshToken);
  } else {
    throw new Error('Codigo ou refresh token ausente.');
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(BLING_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Falha ao obter token do Bling.');
  }
  return (await response.json()) as BlingTokenResponse;
};

export const getBlingAccessToken = async () => {
  const token = await getStoredBlingToken();
  if (!token) return null;
  const expiresAt = Date.parse(token.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 60 * 1000) {
    return token.accessToken;
  }
  const refreshed = await exchangeBlingToken({
    refreshToken: token.refreshToken,
  });
  const newExpires = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await saveBlingToken({
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || token.refreshToken,
    expiresAt: newExpires,
    tokenType: refreshed.token_type,
    scope: refreshed.scope,
    createdAt: nowIso(),
  });
  return refreshed.access_token;
};

export const blingApiFetch = async (
  endpoint: string,
  params?: Record<string, string | number | undefined | null>,
) => {
  const accessToken = await getBlingAccessToken();
  if (!accessToken) {
    const error = new Error('Bling nao conectado.');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  const url = new URL(`${BLING_API_BASE}${endpoint}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text || 'Erro ao consultar Bling.');
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return response.json();
};

export const blingApiPost = async (
  endpoint: string,
  payload: Record<string, unknown>,
) => {
  const accessToken = await getBlingAccessToken();
  if (!accessToken) {
    const error = new Error('Bling nao conectado.');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  const response = await fetch(`${BLING_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text || 'Erro ao enviar dados ao Bling.');
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return response.json();
};

export const buildConnectUrl = async () => {
  const { clientId, redirectUri } = getBlingConfig();
  if (!clientId || !redirectUri) {
    throw new Error('Bling OAuth nao configurado.');
  }
  const state = generateOauthState();
  await storeOauthState(state);
  const authUrl = new URL('https://www.bling.com.br/Api/v3/oauth/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  return authUrl.toString();
};

export const handleBlingCallback = async (code: string) => {
  const token = await exchangeBlingToken({ code });
  if (!token.refresh_token) {
    throw new Error('Refresh token nao informado pelo Bling.');
  }
  const expiresAt = new Date(
    Date.now() + token.expires_in * 1000,
  ).toISOString();
  await saveBlingToken({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt,
    tokenType: token.token_type,
    scope: token.scope,
    createdAt: nowIso(),
  });
};
