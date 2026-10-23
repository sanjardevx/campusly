/** Month-grid helpers shared by the admin school calendar and the student calendar */

const pad = (n: number) => String(n).padStart(2, '0');

export const isoDay = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** "2026-10" moved by `step` months */
export function shiftMonth(month: string, step: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + step, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Monday-first weeks of a month; null = a cell outside the month */
export function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const days = new Date(year, month, 0).getDate();
  const lead = (first + 6) % 7;
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** Every day an event covers inside this month ("YYYY-MM-DD" compares as text) */
export function daysOf(event: { startsOn: string; endsOn: string }, year: number, month: number): string[] {
  const last = new Date(year, month, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    const day = isoDay(year, month, d);
    if (day >= event.startsOn && day <= event.endsOn) out.push(day);
  }
  return out;
}
