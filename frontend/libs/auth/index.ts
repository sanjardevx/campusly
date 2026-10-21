import type { ApolloClient } from '@apollo/client';
import { sessionReadyVar, tempPasswordWarningVar, userVar } from '@/apollo/store';
import {
  type AuthResult,
  loginRequest,
  logoutRequest,
  refreshRequest,
  type SessionUser,
} from './api';
import { setAccessToken } from './token';

function applyAuthResult(result: AuthResult): string {
  setAccessToken(result.accessToken);
  userVar(result.user);
  tempPasswordWarningVar(result.tempPasswordWarning ?? null);
  return result.accessToken;
}

function endSession() {
  setAccessToken(null);
  userVar(null);
  tempPasswordWarningVar(null);
}

export async function logIn(
  loginId: string,
  password: string,
): Promise<SessionUser> {
  const result = await loginRequest(loginId, password);
  applyAuthResult(result);
  return result.user;
}

/**
 * Single-flight refresh: while one /auth/refresh is running, every caller gets the SAME promise.
 * Six parallel queries with an expired token → one refresh, not six (with token rotation,
 * five of them would otherwise look like reuse of an old token).
 * Resolves to the new token, or null when there is no session (no or expired cookie).
 */
let refreshing: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= refreshRequest()
    .then(applyAuthResult)
    .catch(() => {
      endSession();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * On app start: the token is gone after a reload, the httpOnly cookie is not.
 * Once per page load (React StrictMode runs effects twice in development).
 */
let restoring: Promise<SessionUser | null> | null = null;

export function restoreSession(): Promise<SessionUser | null> {
  restoring ??= refreshAccessToken().then((token) => {
    sessionReadyVar(true);
    return token ? userVar() : null;
  });
  return restoring;
}

/** Server revokes the refresh token; the cache is cleared so the next user sees nothing of ours */
export async function logOut(client: ApolloClient): Promise<void> {
  try {
    await logoutRequest();
  } finally {
    endSession();
    await client.clearStore();
  }
}
