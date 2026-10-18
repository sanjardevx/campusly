import type { Role } from '../enums/user.enum';

/** Access token payload: only what every request needs (Nestar put the whole member here) */
export interface JwtPayload {
  /** user id */
  sub: string;
  role: Role;
  /** "password change required": only me / changePassword / logout are allowed */
  pwc?: true;
}

/** The signed-in user that guards put on req.user */
export interface AuthUser {
  id: string;
  role: Role;
  mustChangePassword: boolean;
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
  };
  /** Shown as a banner while a temporary password is in use */
  tempPasswordWarning?: { usesLeft: number; expiresAt: string };
}
