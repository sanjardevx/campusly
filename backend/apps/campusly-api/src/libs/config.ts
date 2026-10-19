import { z } from 'zod';

// Every env variable the API needs. ConfigModule runs validateEnv() once at startup:
// if anything is missing or wrong, the app stops with a clear message (fail fast).
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: z.string().startsWith('postgresql://'),
    REDIS_URL: z.string().startsWith('redis://'),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    FRONTEND_URL: z.url(),
    PORT_API: z.coerce.number().int().positive().default(3000),
  })
  .refine((env) => env.JWT_ACCESS_SECRET !== env.JWT_REFRESH_SECRET, {
    path: ['JWT_REFRESH_SECRET'],
    message: 'must be different from JWT_ACCESS_SECRET',
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${problems}`);
  }
  return result.data;
}

// ───────────────────────────── auth ─────────────────────────────
// DECISIONS §6–7. Nestar used one 30-day JWT; here the access token is short and the refresh token rotates.

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_COOKIE = 'campusly_rt';
/** Refresh token lifetime in days, by role (admins sign in every day) */
export const REFRESH_TTL_DAYS = {
  ADMIN: 1,
  TEACHER: 14,
  STUDENT: 14,
  PARENT: 30,
} as const;
/** Login rate limit: failed attempts per window */
export const LOGIN_LIMIT = { perLoginId: 5, perIp: 30, windowSec: 15 * 60 };
/** A just-rotated refresh token still works this long (two tabs refreshing at the same time) */
export const REFRESH_GRACE_SEC = 10;
/** New accounts and password resets: the temporary password works for 3 sign-ins or 14 days */
export const TEMP_PASSWORD = { uses: 3, days: 14 };
