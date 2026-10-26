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
    // Public demo (DECISIONS §12): "Demo login" buttons sign in as the seeded isDemo accounts
    DEMO_MODE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    // The batch's nightly demo reset gives every seeded account this password (DEMO_MODE only)
    SEED_PASSWORD: optional(z.string().min(8)),

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

    // Telegram bot (account linking + password reset). All or nothing: without them it is off (CI, tests).
    TELEGRAM_BOT_TOKEN: optional(z.string().regex(/^\d+:[\w-]{30,}$/)),
    // Telegram sends it back in a header on every webhook call: 1–256 of A–Z a–z 0–9 _ -
    TELEGRAM_WEBHOOK_SECRET: optional(z.string().regex(/^[\w-]{32,256}$/)),
    TELEGRAM_BOT_USERNAME: optional(z.string().regex(/^\w{5,32}bot$/i)),

    // AI Study Tutor (DECISIONS §14). off = the page says "not connected" (CI, local without keys);
    // fake = canned hints and word-hash embeddings for tests and offline work; anthropic = Claude on
    // the Anthropic API (production); bedrock = Claude on Bedrock (kept for later). Embeddings: Titan.
    TUTOR_PROVIDER: z
      .enum(['off', 'fake', 'anthropic', 'bedrock'])
      .default('off'),
    // Requests per student per day ("Show another hint" counts too)
    TUTOR_DAILY_LIMIT: z.coerce.number().int().min(1).max(200).default(20),
    // Anthropic API (TUTOR_PROVIDER=anthropic): the key lives in SSM as a SecureString
    ANTHROPIC_API_KEY: optional(z.string().regex(/^sk-ant-[\w-]{20,}$/)),
    ANTHROPIC_CHAT_MODEL_ID: z.string().min(3).default('claude-haiku-5-5'),
    // bedrock-runtime in AWS_REGION: Claude through the EU inference profile, and the embedding model
    BEDROCK_CHAT_MODEL_ID: z
      .string()
      .min(3)
      .default('eu.anthropic.claude-haiku-5-5'),
    BEDROCK_EMBED_MODEL_ID: z
      .string()
      .min(3)
      .default('amazon.titan-embed-text-v2:0'),
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
    const telegram = {
      TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_WEBHOOK_SECRET: env.TELEGRAM_WEBHOOK_SECRET,
      TELEGRAM_BOT_USERNAME: env.TELEGRAM_BOT_USERNAME,
    };
    const telegramMissing = Object.entries(telegram).filter(([, v]) => !v);
    if (telegramMissing.length && telegramMissing.length < 3) {
      for (const [key] of telegramMissing) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'required for the Telegram bot (set all three or none)',
        });
      }
    }
    if (env.TUTOR_PROVIDER === 'anthropic' && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['ANTHROPIC_API_KEY'],
        message: 'required when TUTOR_PROVIDER=anthropic',
      });
    }
    // Canned answers must never reach real students
    if (env.NODE_ENV === 'production' && env.TUTOR_PROVIDER === 'fake') {
      ctx.addIssue({
        code: 'custom',
        path: ['TUTOR_PROVIDER'],
        message: 'fake is for tests and local work only',
      });
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
/** Demo sign-ins per IP in 15 minutes (each one makes a refresh-token row) */
export const DEMO_LIMIT = { perIp: 20, windowSec: 15 * 60 };
/** A just-rotated refresh token still works this long (two tabs refreshing at the same time) */
export const REFRESH_GRACE_SEC = 10;

// ───────────────────────────── Telegram ─────────────────────────────

/** A portal link that connects a student's Telegram works this long, once */
export const TELEGRAM_LINK_TTL_MIN = 15;
/** A password-reset link sent by the bot works this long, once */
export const PASSWORD_RESET_TTL_MIN = 15;
/** /reset requests per Telegram chat per hour (each sends a new link) */
export const RESET_LIMIT = { perChat: 3, windowSec: 60 * 60 };
/** POST /auth/reset-password attempts per IP in 15 minutes (guessing tokens is pointless, but cheap to stop) */
export const RESET_SUBMIT_LIMIT = { perIp: 20, windowSec: 15 * 60 };
/**
 * Temporary passwords: the rule itself is a school setting (default 3 sign-ins / 14 days). These are
 * the limits an admin may choose within: a temporary password that lives for months is a hole.
 */
export const TEMP_PASSWORD_LIMITS = { maxUses: 10, maxDays: 60 };

// ───────────────────────────── AI Study Tutor ─────────────────────────────
// DECISIONS §14.

/** "Today" for the tutor limits: they reset at midnight school time */
export const TUTOR_TIMEZONE = 'Asia/Tashkent';
/** The whole school's tutor spend per day, in USD; when it is used up the tutor waits for tomorrow */
export const TUTOR_DAILY_BUDGET_USD = 2;
/**
 * USD per million tokens of the chat model, for the budget, per provider. Anthropic API: Claude
 * Haiku 5.5 is $0.10 / $0.50 (prompts up to 100K). Bedrock prices Claude on its own, so it is counted
 * high (Haiku 4.5's $1 / $5 + 10 % for the EU profile): over-counting only stops the tutor earlier.
 */
export const TUTOR_PRICES = {
  anthropic: { input: 0.1, output: 0.5 },
  bedrock: { input: 1.1, output: 5.5 },
  fake: { input: 0, output: 0 },
} as const;
/** Titan Text Embeddings V2, USD per million tokens (every provider embeds with it) */
export const TUTOR_EMBED_PRICE = 0.02;
/** A hint is short: the model may write at most this many tokens */
export const TUTOR_MAX_TOKENS = 1024;
/** Earlier messages sent with each request (the conversation's memory) */
export const TUTOR_HISTORY_MESSAGES = 12;
/** Pieces of course material given to the model per question */
export const TUTOR_CONTEXT_CHUNKS = 5;
/** Longest question a student may send, in characters */
export const TUTOR_QUESTION_MAX = 2000;
/** Material is cut into pieces of about this many characters (with a small overlap) */
export const TUTOR_CHUNK = { size: 1200, overlap: 150 };
/** Embedding size (Titan V2 allows 256 / 512 / 1024); the DB column is vector(1024) */
export const TUTOR_EMBED_DIMENSIONS = 1024;
/** Files the batch reads for the index: PDFs up to this size and page count */
export const TUTOR_PDF_LIMITS = { maxMb: 20, maxPages: 80 };
/** Sources (re)indexed per batch run; the rest wait for the next run */
export const TUTOR_INDEX_BATCH = 40;

// ───────────────────────────── lists ─────────────────────────────

/** Columns a user list may be sorted by (like Nestar's availableMemberSorts): nothing else is accepted */
export const USER_SORTS = ['createdAt', 'lastName', 'loginId'] as const;
/** Page size limit for every list (Nestar had none: limit=1000000 returned the whole collection) */
export const MAX_PAGE_SIZE = 100;
/** Classes in one "grade" filter (a grade has a handful of classes; this only stops abuse) */
export const MAX_GROUP_FILTER = 50;

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
// ───────────────────────────── quizzes ─────────────────────────────

/** Time limit choices: 1 minute to 3 hours; a new quiz starts with 20 */
export const QUIZ_MAX_MINUTES = 180;
export const QUIZ_DEFAULT_MINUTES = 20;
export const QUIZ_MAX_QUESTIONS = 50;
/** Multiple choice: 2 to 6 answers */
export const QUIZ_MAX_OPTIONS = 6;
/** An answer that left the browser just before the deadline still counts (network delay) */
export const QUIZ_GRACE_SEC = 5;

/** A presigned upload URL works this long */
export const UPLOAD_URL_TTL_SEC = 15 * 60;
/** The batch app marks uploads still UPLOADING after this long as FAILED (and deletes the file) */
export const STALE_UPLOAD_HOURS = 24;
/** DEMO_MODE only: the batch app puts the demo data back every night at 03:00 school time */
export const DEMO_RESET_CRON = '0 3 * * *';
export const DEMO_RESET_TIMEZONE = 'Asia/Tashkent';
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
/** Files a teacher attaches to one assignment */
export const MAX_ASSIGNMENT_FILES = 5;
/** Files on one announcement */
export const MAX_ANNOUNCEMENT_FILES = 5;
/** Files per submission attempt */
export const MAX_SUBMISSION_FILES = 10;
/** Default grade category for a new assignment, by type (the school default categories) */
export const DEFAULT_CATEGORY_BY_TYPE = {
  HOMEWORK: 'Homework',
  QUIZ: 'Quizzes',
  EXAM: 'Exams',
} as const;
