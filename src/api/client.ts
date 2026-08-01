import Constants from 'expo-constants';
import { deleteItem, getItem, setItem } from './storage';

const TOKEN_KEY = 'kaontime.accessToken';
const API_PORT = 5000;

/**
 * On a physical device `localhost` points at the device itself, so fall back
 * to the LAN IP that Expo is already serving the bundle from.
 */
function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:${API_PORT}/api`;
}

const BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const getToken = () => getItem(TOKEN_KEY);
export const setToken = (token: string) => setItem(TOKEN_KEY, token);
export const clearToken = () => deleteItem(TOKEN_KEY);

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export async function request<T>(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions = {},
): Promise<T | null> {
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, `Cannot reach the server at ${BASE_URL}.`);
  }

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    // Nest returns `message` as a string, or an array for validation errors.
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : (payload?.message ?? response.statusText);

    throw new ApiError(response.status, message);
  }

  return payload as T;
}

export const api = {
  baseUrl: BASE_URL,
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
};
