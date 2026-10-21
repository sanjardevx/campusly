import { CombinedGraphQLErrors } from '@apollo/client';
import { AuthError } from '@/libs/auth/api';

/** The backend's error code from any failed call (REST auth or GraphQL); never the message */
export function errorCode(err: unknown): string {
  if (err instanceof AuthError) return err.code;
  if (CombinedGraphQLErrors.is(err)) {
    const code = err.errors[0]?.extensions?.code;
    return typeof code === 'string' ? code : 'UNKNOWN';
  }
  return 'NETWORK_ERROR';
}
