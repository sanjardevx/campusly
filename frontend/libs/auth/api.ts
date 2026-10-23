import type { Role } from '@/libs/gql/graphql';
import { API_URL } from '@/libs/config';

/** The signed-in user, as POST /auth/login and /auth/refresh return it */
export interface SessionUser {
  id: string;
  loginId: string;
  role: Role;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
  /** Students: the current class ("9A"), for "Grade 9A · ID …" in the top bar */
  className: string | null;
}

export interface AuthResult {
  accessToken: string;
  user: SessionUser;
  /** A temporary password is in use: shown as a banner */
  tempPasswordWarning?: { usesLeft: number; expiresAt: string };
}

/** A failed auth request; `code` is the backend's ErrorCode (never compare messages) */
export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// REST, not GraphQL: these endpoints set and read the httpOnly refresh cookie.
// credentials: 'include' lets the browser send and store that cookie.
async function post<T>(path: string, body?: object): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AuthError('NETWORK_ERROR', 'Cannot reach the server');
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new AuthError(data.code ?? 'INTERNAL_SERVER_ERROR', data.message ?? '');
  }
  return data as T;
}

export const loginRequest = (loginId: string, password: string) =>
  post<AuthResult>('login', { loginId, password });

export const refreshRequest = () => post<AuthResult>('refresh');

export const logoutRequest = () => post<void>('logout');
