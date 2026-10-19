import { randomInt } from 'node:crypto';

// Temporary passwords are printed on login slips and typed by hand, so characters that look
// alike (0/O, 1/l/I) are left out. crypto.randomInt, not Math.random (which is predictable).
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '#@$%&*!?';
const CONSONANTS = 'bcdfghjkmnprstvz';
const VOWELS = 'aeiou';

const pick = (chars: string) => chars[randomInt(chars.length)];

/** Fisher–Yates shuffle with a crypto random source */
function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

/** Student: 8 characters with at least one upper, lower, digit and symbol, e.g. "Kp7#mRx2" */
export function generateStudentPassword(): string {
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  const rest = Array.from({ length: 4 }, () => pick(all));
  return shuffle([...required, ...rest]).join('');
}

/**
 * Parent: easy to read and dictate over the phone, e.g. "Rus6738#" (DECISIONS §6).
 * Weaker than the student format, which is acceptable because it only works for
 * 3 sign-ins / 14 days and login is rate-limited.
 */
export function generateParentPassword(): string {
  const word = pick(CONSONANTS).toUpperCase() + pick(VOWELS) + pick(CONSONANTS);
  const digits = Array.from({ length: 4 }, () => pick(DIGITS)).join('');
  return `${word}${digits}${pick(SYMBOLS)}`;
}
