import type { Role } from '../enums/user.enum';

/** Access token payload: only what every request needs (no profile data in the token) */
export interface JwtPayload {
  /** user id */
  sub: string;
  role: Role;
  /** session id = refresh-token family of this sign-in */
  sid: string;
  /** "password change required": only me / changePassword / logout are allowed */
  pwc?: true;
  /** A demo account: @NotForDemo() operations answer DEMO_READ_ONLY */
  demo?: true;
}

/** The signed-in user that guards put on req.user */
export interface AuthUser {
  id: string;
  role: Role;
  sessionId: string;
  mustChangePassword: boolean;
  isDemo: boolean;
}

/** Response of POST /auth/login and POST /auth/refresh */
export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    loginId: string;
    role: Role;
    firstName: string;
    lastName: string;
    mustChangePassword: boolean;
    /** Students: the current class ("9A") for the top bar; null for other roles */
    className: string | null;
    /** A demo account: the portal shows the demo bar */
    isDemo: boolean;
  };
  /** Shown as a banner while a temporary password is in use */
  tempPasswordWarning?: { usesLeft: number; expiresAt: string };
}
