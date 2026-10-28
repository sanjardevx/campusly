// Time and randomness of one seed run. seedDemo() calls startRun(); every other seed module reads
// these helpers, so the whole run shares one week shift and one random sequence.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Today" of the demo story. The data is written around this date (string comparisons);
 * day() / tashkent() add the week shift when the nightly reset moves the story forward.
 */
export const TODAY = '2026-10-17';

let shiftMs = 0;
let randomState = 2026;

/** A new run: the week shift for this run and the random sequence from its start */
export function startRun(shift: number) {
  shiftMs = shift;
  randomState = 2026; // the same "random" data on every run, also in a long-running worker
}

export const shiftedWeeks = () => shiftMs / (7 * DAY_MS);

/** Calendar date for @db.Date columns (no time, no timezone), moved by the week shift */
export const day = (iso: string) =>
  new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + shiftMs);

/** A moment in Tashkent time (UTC+5), stored as UTC, moved by the week shift */
export const tashkent = (iso: string, time = '23:59') =>
  new Date(new Date(`${iso}T${time}:00+05:00`).getTime() + shiftMs);

/** YYYY-MM-DD of a calendar date plus n days (story dates: not shifted) */
export const addDays = (iso: string, n: number) =>
  new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + n * DAY_MS)
    .toISOString()
    .slice(0, 10);

/** 1 = Monday … 7 = Sunday of a story date */
export const weekday = (iso: string) =>
  ((new Date(`${iso}T00:00:00.000Z`).getUTCDay() + 6) % 7) + 1;

/** Seeded random numbers (mulberry32): the same "random" scores and attendance on every run */
export function random() {
  randomState = (randomState + 0x6d2b79f5) | 0;
  let t = randomState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** One item of a list, picked by the seeded random */
export const pick = <T>(list: readonly T[]): T =>
  list[Math.floor(random() * list.length)];

/** Whole weeks from TODAY to `to` in Tashkent: weekdays stay the same (no lessons on Sunday) */
export function weekShiftMs(to: Date): number {
  const tashkentToday = new Date(to.getTime() + 5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const days = Math.round(
    (Date.parse(tashkentToday) - Date.parse(TODAY)) / DAY_MS,
  );
  return Math.max(0, Math.floor(days / 7)) * 7 * DAY_MS;
}
