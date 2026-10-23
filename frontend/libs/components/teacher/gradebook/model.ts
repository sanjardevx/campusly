import type { CoursePeriodsQuery, GradebookCoursesQuery, GradebookGradesQuery } from '@/libs/gql/graphql';

export type GradebookCourse = GradebookCoursesQuery['teachingCourses'][number];
export type Category = GradebookCourse['gradeCategories'][number];
export type StudentRow = GradebookGradesQuery['courseGrades'][number];
export type Period = CoursePeriodsQuery['periods'][number];

export interface Thresholds {
  mark5MinPercent: number;
  mark4MinPercent: number;
  mark3MinPercent: number;
}

/** The 5-point mark from a %, with the school's thresholds (DECISIONS §10); null = no grade */
export function markOf(percent: number | null | undefined, t: Thresholds): number | null {
  if (percent == null) return null;
  if (percent >= t.mark5MinPercent) return 5;
  if (percent >= t.mark4MinPercent) return 4;
  if (percent >= t.mark3MinPercent) return 3;
  return 2;
}

/** Leaf periods (quarters, not the semesters above them), in calendar order */
export function leafPeriods(periods: Period[]): Period[] {
  const parents = new Set(periods.map((p) => p.parentId).filter(Boolean));
  return periods.filter((p) => !parents.has(p.id)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** "2026-10-24" of a moment in the school's timezone: an assignment's period is decided by it */
export const dayInZone = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

/** Same rule as the server: due in the period's days (school time); no due date = no period */
export const inPeriod = (dueAt: string | null | undefined, period: Pick<Period, 'startsAt' | 'endsAt'>, timeZone: string) => {
  if (!dueAt) return false;
  const day = dayInZone(dueAt, timeZone);
  return day >= period.startsAt && day <= period.endsAt;
};

export const average = (values: (number | null | undefined)[]): number | null => {
  const nums = values.filter((v): v is number => typeof v === 'number');
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
};

/** "84.6%" · "—" */
export const pct = (v: number | null | undefined) => (v == null ? '—' : `${(Math.round(v * 10) / 10).toFixed(1)}%`);

/** Mark chip colours from Stitch: 5 spruce, 4 wash, 3 ochre, 2 red */
export const MARK_STYLE: Record<number, { color: string; bg: string }> = {
  5: { color: '#FFFFFF', bg: '#1F4E43' },
  4: { color: '#1F4E43', bg: '#E8EFEA' },
  3: { color: '#B45309', bg: '#FEF3C7' },
  2: { color: '#DC2626', bg: '#FEE2E2' },
};
