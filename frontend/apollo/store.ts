import { makeVar } from '@apollo/client';
import type { SessionUser } from '@/libs/auth/api';

// The signed-in user. It comes from the server response, not from decoding a token kept in
// localStorage.

/** null = not signed in */
export const userVar = makeVar<SessionUser | null>(null);

/** Set while a temporary password is in use (banner: "2 sign-ins left") */
export const tempPasswordWarningVar = makeVar<{
  usesLeft: number;
  expiresAt: string;
} | null>(null);

/** false until the first silent refresh has answered (route guards wait for it) */
export const sessionReadyVar = makeVar(false);

/** Last part of the top-bar breadcrumb set by the page ("Users / Students"); null = menu label only */
export const crumbVar = makeVar<string | null>(null);
