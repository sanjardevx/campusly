import { randomBytes } from 'node:crypto';

/**
 * A UUID v7 made here instead of by the database: the seed knows a row's id before writing it, so
 * a submission and its attempt (or a session and its records) go in with two createMany calls
 * instead of thousands of single inserts. v7 starts with the time, like the ids Prisma makes.
 */
export function uuidv7(): string {
  const b = randomBytes(16);
  const ms = Date.now();
  b[0] = Math.floor(ms / 2 ** 40) & 0xff;
  b[1] = Math.floor(ms / 2 ** 32) & 0xff;
  b[2] = (ms >>> 24) & 0xff;
  b[3] = (ms >>> 16) & 0xff;
  b[4] = (ms >>> 8) & 0xff;
  b[5] = ms & 0xff;
  b[6] = (b[6] & 0x0f) | 0x70; // version 7
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * createMany in slices: Postgres takes at most 65 535 parameters per statement, so a list of
 * 40 000 attendance rows goes in as several statements.
 */
export async function insertAll<T>(
  rows: T[],
  write: (slice: T[]) => Promise<unknown>,
  size = 2000,
) {
  for (let i = 0; i < rows.length; i += size) {
    await write(rows.slice(i, i + size));
  }
}
