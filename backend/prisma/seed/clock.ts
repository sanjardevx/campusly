// Time and randomness of one seed run. seedDemo() / resetDemoClasses() call startRun(); every other
// seed module reads these helpers, so the whole run shares one "today" and one random sequence.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Today" of this run: the real date in Tashkent (the demo follows the real school calendar).
 * The data is written around it with string comparisons ("2026-11-09" < "2026-11-14").
 */
let todayIso = '';
let randomState = 2026;

/** The school date (YYYY-MM-DD in Tashkent, UTC+5) of a moment */
export const schoolDate = (at: Date) =>
  new Date(at.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** A new run: its "today" and the random sequence from its start */
export function startRun(now: Date) {
  todayIso = schoolDate(now);
  randomState = 2026; // the same "random" data on every run, also in a long-running worker
}

/** The run's "today" (YYYY-MM-DD) */
export const today = () => todayIso;

/** Calendar date for @db.Date columns (no time, no timezone) */
export const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** A moment in Tashkent time (UTC+5), stored as UTC */
export const tashkent = (iso: string, time = '23:59') =>
  new Date(`${iso}T${time}:00+05:00`);

/** YYYY-MM-DD of a calendar date plus n days */
export const addDays = (iso: string, n: number) =>
  new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + n * DAY_MS)
    .toISOString()
    .slice(0, 10);

/** 1 = Monday … 7 = Sunday of a date */
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
