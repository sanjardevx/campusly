/**
 * Deadlines are typed in the school's time ("Tashkent time", DECISIONS §12) whatever the teacher's
 * own computer says. These two helpers convert between "2026-10-24T23:59" in a timezone and the UTC
 * moment the API stores. Intl does the timezone math; no extra library.
 */

/** Minutes the timezone is ahead of UTC at that moment (Tashkent: 300) */
function offsetMinutes(at: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** "2026-10-24T23:59" in timeZone → the UTC moment (ISO string for the API) */
export function zonedToUtc(local: string, timeZone: string): string {
  const [day, time = '00:00'] = local.split('T');
  const [y, m, d] = day.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, min);
  const offset = offsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offset * 60_000).toISOString();
}

/** A UTC moment → "2026-10-24T23:59" in timeZone (for a datetime-local input) */
export function utcToZoned(iso: string, timeZone: string): string {
  const at = new Date(iso);
  const shifted = new Date(at.getTime() + offsetMinutes(at, timeZone) * 60_000);
  return shifted.toISOString().slice(0, 16);
}
