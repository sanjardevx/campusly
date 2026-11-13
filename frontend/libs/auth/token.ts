import { jwtDecode } from 'jwt-decode';

/**
 * The access token lives ONLY in this module variable (DECISIONS §7), never in localStorage,
 * where any injected script can read it with one line. After a page reload the
 * variable is empty and the httpOnly refresh cookie brings a new token (silent refresh).
 */
let accessToken: string | null = null;

export const getAccessToken = () => accessToken;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** True when the token ends within `marginSec` seconds (or cannot be read) */
export function expiresSoon(token: string, marginSec = 30): boolean {
  try {
    const { exp } = jwtDecode<{ exp: number }>(token);
    return exp * 1000 - Date.now() < marginSec * 1000;
  } catch {
    return true;
  }
}
