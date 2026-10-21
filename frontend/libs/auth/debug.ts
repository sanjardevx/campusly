import { refreshAccessToken } from '.';
import { getAccessToken, setAccessToken } from './token';

/**
 * Development only: lets you test token expiry from the browser console without waiting 15 min.
 *   campuslyDebug.expireToken()  → the next requests refresh first (single-flight)
 *   campuslyDebug.breakToken()   → the server refuses the token → errorLink refreshes and retries
 */
// A token-shaped string whose `exp` is in the past / far in the future (signature is fake)
const fakeToken = (exp: number) =>
  `x.${btoa(JSON.stringify({ exp })).replace(/=+$/, '')}.x`;

/** The next requests see an expired token → they refresh first (single-flight) */
export const expireToken = () =>
  setAccessToken(fakeToken(Math.floor(Date.now() / 1000) - 60));

/** A token the server refuses → errorLink refreshes and retries the request */
export const breakToken = () =>
  setAccessToken(fakeToken(Math.floor(Date.now() / 1000) + 3600));

export function installAuthDebug() {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') {
    return;
  }
  Object.assign(window, {
    campuslyDebug: {
      token: getAccessToken,
      expireToken,
      breakToken,
      refresh: refreshAccessToken,
    },
  });
}
