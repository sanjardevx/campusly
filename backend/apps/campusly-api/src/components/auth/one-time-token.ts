import { createHash, randomBytes } from 'node:crypto';
import type {
  OneTimeTokenPurpose,
  Prisma,
} from '../../../../../generated/prisma/client';
import type { PrismaService } from '../../database/prisma.service';

type Db = Prisma.TransactionClient | PrismaService;

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

/**
 * A random one-time token (password reset, Telegram link). The raw value goes to the user once;
 * only its sha256 hash is stored, so a database leak gives no usable links. Older unused tokens
 * of the same purpose stop working: only the newest link is valid.
 */
export async function issueOneTimeToken(
  db: Db,
  userId: string,
  purpose: OneTimeTokenPurpose,
  ttlMinutes: number,
): Promise<{ token: string; expiresAt: Date }> {
  const now = new Date();
  await db.oneTimeToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: now },
  });
  // 24 bytes → 32 base64url characters: fits Telegram's /start payload (max 64, A–Z a–z 0–9 _ -)
  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);
  await db.oneTimeToken.create({
    data: { userId, purpose, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt };
}

/**
 * Uses a token: valid only if it exists, has this purpose, is not expired and not used yet.
 * The update is conditional (usedAt: null), so two parallel requests cannot both use it.
 * Returns the owner's id, or null for any invalid token (the caller does not say which case).
 */
export async function consumeOneTimeToken(
  db: Db,
  purpose: OneTimeTokenPurpose,
  token: string,
): Promise<string | null> {
  const row = await db.oneTimeToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, purpose: true, expiresAt: true },
  });
  const now = new Date();
  if (!row || row.purpose !== purpose || row.expiresAt <= now) return null;
  const { count } = await db.oneTimeToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: now },
  });
  return count === 1 ? row.userId : null;
}
