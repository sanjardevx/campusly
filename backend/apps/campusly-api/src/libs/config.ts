import { z } from 'zod';

/** `KEY=` (empty, as in .env.example) counts as not set */
const optional = (schema: z.ZodString) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

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

    // Media (S3 + CloudFront). All or nothing: without them uploads and videos are off (CI, tests).
    AWS_REGION: z.string().default('eu-central-1'),
    S3_BUCKET: optional(z.string().min(3)),
    // Local only: in production the EC2 IAM role gives the credentials
    AWS_ACCESS_KEY_ID: optional(z.string().min(16)),
    AWS_SECRET_ACCESS_KEY: optional(z.string().min(16)),
    CLOUDFRONT_DOMAIN: optional(z.string().min(3)),
    CLOUDFRONT_KEY_PAIR_ID: optional(z.string().min(3)),
    // The key that signs video links: a file outside the repo (local) or the PEM text (production)
    CLOUDFRONT_PRIVATE_KEY_PATH: optional(z.string()),
    CLOUDFRONT_PRIVATE_KEY: optional(z.string()),
  })
  .refine((env) => env.JWT_ACCESS_SECRET !== env.JWT_REFRESH_SECRET, {
    path: ['JWT_REFRESH_SECRET'],
    message: 'must be different from JWT_ACCESS_SECRET',
  })
  .superRefine((env, ctx) => {
    const media = {
      S3_BUCKET: env.S3_BUCKET,
      CLOUDFRONT_DOMAIN: env.CLOUDFRONT_DOMAIN,
      CLOUDFRONT_KEY_PAIR_ID: env.CLOUDFRONT_KEY_PAIR_ID,
      CLOUDFRONT_PRIVATE_KEY_PATH:
        env.CLOUDFRONT_PRIVATE_KEY_PATH ?? env.CLOUDFRONT_PRIVATE_KEY,
    };
    const missing = Object.entries(media).filter(([, v]) => !v);
    const someSet = missing.length < Object.keys(media).length;
    // Half-configured media fails at startup, not at the first upload
    if (someSet || env.NODE_ENV === 'production') {
      for (const [key] of missing) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message:
            key === 'CLOUDFRONT_PRIVATE_KEY_PATH'
              ? 'set CLOUDFRONT_PRIVATE_KEY_PATH or CLOUDFRONT_PRIVATE_KEY'
              : 'required for media (S3 + CloudFront)',
        });
      }
    }
    if (!!env.AWS_ACCESS_KEY_ID !== !!env.AWS_SECRET_ACCESS_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['AWS_SECRET_ACCESS_KEY'],
        message:
          'set both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or none',
      });
    }
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

// ───────────────────────────── lists ─────────────────────────────

/** Columns a user list may be sorted by (like Nestar's availableMemberSorts): nothing else is accepted */
export const USER_SORTS = ['createdAt', 'lastName', 'loginId'] as const;
/** Page size limit for every list (Nestar had none: limit=1000000 returned the whole collection) */
export const MAX_PAGE_SIZE = 100;

// ───────────────────────────── school ─────────────────────────────

/** UI languages (DECISIONS §3): Korean is "ko", not Nestar's "kr" (a country code) */
export const LOCALES = ['en', 'uz', 'ru', 'ko'] as const;

// ───────────────────────────── import ─────────────────────────────

/**
 * Student CSV import: every row needs a bcrypt hash (~70 ms), so 300 rows ≈ 20 s.
 * Bigger imports will move to the batch worker (BullMQ) later.
 */
export const IMPORT_LIMIT = {
  maxRows: 300,
  maxChars: 100_000,
  txTimeoutMs: 60_000,
};

// ───────────────────────────── media ─────────────────────────────
// DECISIONS §11. Nestar saved uploads on the server disk; here the browser uploads straight to S3.

/** What may be uploaded, by kind: MIME types and the size limit */
export const UPLOAD_RULES = {
  VIDEO: { mimeTypes: ['video/mp4'], maxBytes: 2 * 1024 ** 3 },
  DOCUMENT: {
    mimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    maxBytes: 50 * 1024 ** 2,
  },
  IMAGE: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 10 * 1024 ** 2,
  },
} as const;
/** File extension in the S3 key, by MIME type (the user's file name is never used) */
export const MIME_EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
/** Unfinished uploads one user may have at a time (stops filling the bucket with junk) */
export const MAX_PENDING_UPLOADS = 20;
/** A presigned upload URL works this long */
export const UPLOAD_URL_TTL_SEC = 15 * 60;
/** The batch app marks uploads still UPLOADING after this long as FAILED (and deletes the file) */
export const STALE_UPLOAD_HOURS = 24;
/** A CloudFront video link works this long (DECISIONS §11: ~3 h) */
export const VIDEO_URL_TTL_SEC = 3 * 60 * 60;

// ───────────────────────────── progress ─────────────────────────────

/**
 * Video progress (DECISIONS §11, sequential watch rule). Until a lesson is completed the student
 * watches at 1× without seeking forward; the server lets the furthest point grow only as fast as
 * real time, so skipping ahead or a fake request does not complete a lesson.
 */
export const PROGRESS = {
  /** A VIDEO_WATCHED lesson is done when the furthest point reaches this share of the video */
  completePercent: 90,
  /** The player sends its position about this often; a longer gap counts as this long */
  heartbeatSec: 20,
  /** Until completed: the furthest point may not move faster than this */
  maxSpeed: 1,
  /** Network delays between two heartbeats */
  toleranceSec: 3,
};

// ───────────────────────────── assignments ─────────────────────────────

/** File types a teacher may accept in a submission (the upload rules allow exactly these) */
export const SUBMISSION_FILE_TYPES = [
  'pdf',
  'docx',
  'pptx',
  'jpg',
  'png',
  'webp',
] as const;
/** A submitted file's download link works this long (teachers open it from the grading page) */
export const FILE_URL_TTL_SEC = 15 * 60;
/** Files per submission attempt */
export const MAX_SUBMISSION_FILES = 10;
/** Default grade category for a new assignment, by type (the school default categories) */
export const DEFAULT_CATEGORY_BY_TYPE = {
  HOMEWORK: 'Homework',
  QUIZ: 'Quizzes',
  EXAM: 'Exams',
} as const;
