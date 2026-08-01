import { api, clearToken, getToken, setToken } from './client';
import { ApiError } from './client';

export type Role = 'owner' | 'employee';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: Role;
}

interface LoginResponse {
  accessToken: string;
  expiresIn: string;
  user: AuthUser;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const result = await api.post<LoginResponse>(
    '/auth/login',
    { email, password },
    { auth: false },
  );

  await setToken(result!.accessToken);
  return result!.user;
}

/**
 * Tokens are stateless, so the stored token is cleared no matter how the
 * server responds — a 401 just means it had already expired.
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Logging out locally is what matters; ignore transport errors.
  } finally {
    await clearToken();
  }
}

/** Returns the signed-in user, or null if there is no valid session. */
export async function me(): Promise<AuthUser | null> {
  if (!(await getToken())) {
    return null;
  }

  try {
    return await api.get<AuthUser>('/auth/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearToken();
      return null;
    }
    throw error;
  }
}

export const isOwner = (user: AuthUser | null) => user?.role === 'owner';
