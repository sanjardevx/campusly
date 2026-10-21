import type { Role } from '@/libs/gql/graphql';
import type { SessionUser } from './api';

/** Each role's home (layouts come with the route guard) */
export function homeFor(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/_admin';
    case 'TEACHER':
      return '/teacher';
    case 'PARENT':
      return '/parent';
    case 'STUDENT':
      return '/student';
  }
}

/**
 * Only a path inside our app: "/student/courses" yes, "https://evil.com" or "//evil.com" no.
 * Otherwise ?next= would be an open redirect for phishing links.
 */
export function safeNext(next: unknown): string | null {
  if (typeof next !== 'string') return null;
  return next.startsWith('/') && !next.startsWith('//') ? next : null;
}

/** Where to go after signing in */
export function afterSignIn(user: SessionUser, next: unknown): string {
  if (user.mustChangePassword) return '/password';
  return safeNext(next) ?? homeFor(user.role);
}
