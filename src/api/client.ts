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

/** Server origin without the /api suffix — uploads are served from the root. */
export const SERVER_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

/**
 * Uploaded images come back as root-relative paths (/uploads/x.jpg) so the
 * record works from any device. Resolve them against the API origin here.
 */
export function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SERVER_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Uploads a local file URI as multipart/form-data and returns its URL. */
export async function uploadImage(localUri: string): Promise<string> {
  const token = await getToken();
  const name = localUri.split('/').pop() || 'photo.jpg';
  const ext = name.split('.').pop()?.toLowerCase() ?? 'jpg';

  const form = new FormData();
  // React Native's FormData takes this {uri,name,type} shape, not a Blob.
  form.append('file', {
    uri: localUri,
    name,
    type: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/uploads/image`, {
      method: 'POST',
      // Content-Type is intentionally omitted: fetch must set the multipart
      // boundary itself.
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
  } catch {
    throw new ApiError(0, `Cannot reach the server at ${BASE_URL}.`);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : (payload?.message ?? response.statusText);
    throw new ApiError(response.status, message);
  }

  return payload.url as string;
}

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
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
