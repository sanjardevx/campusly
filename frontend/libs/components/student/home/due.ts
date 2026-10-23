import { SCHOOL_TIMEZONE } from '@/libs/config';

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (at: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);

/** Calendar days from today to the deadline on the viewer's clock (0 = today, 1 = tomorrow) */
export function daysUntil(dueAt: string): number {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOf(new Date(dueAt)) - startOf(new Date())) / 86_400_000);
}

/**
 * "Oct 3, 11:59 PM" like Stitch, on the viewer's clock. Uzbek: "03.10 23:59" (browsers have
 * incomplete Uzbek month names, the same reason formatDate uses numbers for uz). Away from the
 * school's timezone the school time is added: "Oct 4, 3:59 AM (23:59 Tashkent)" (DECISIONS §12).
 */
export function formatDueAt(dueAt: string, locale = 'en'): string {
  const at = new Date(dueAt);
  const local =
    locale === 'uz'
      ? `${pad(at.getDate())}.${pad(at.getMonth() + 1)} ${pad(at.getHours())}:${pad(at.getMinutes())}`
      : new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(at);
  const school = clock(at, SCHOOL_TIMEZONE);
  if (clock(at, Intl.DateTimeFormat().resolvedOptions().timeZone) === school) return local;
  return `${local} (${school} ${SCHOOL_TIMEZONE.split('/').pop()})`;
}

/** The deadline as the school sees it ("Oct 24, 11:59 PM"), for lines that already say "Tashkent time" */
export function formatInSchool(iso: string, locale = 'en'): string {
  const at = new Date(iso);
  if (locale === 'uz') {
    const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: SCHOOL_TIMEZONE, ...o }).format(at);
    return `${part({ day: '2-digit' })}.${part({ month: '2-digit' })} ${clock(at, SCHOOL_TIMEZONE)}`;
  }
  return new Intl.DateTimeFormat(locale, { timeZone: SCHOOL_TIMEZONE, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(at);
}

/** Student pages built in the next steps */
export const studentHref = {
  course: (courseId: string) => `/student/courses/${courseId}`,
  lesson: (courseId: string, lessonId: string) => `/student/courses/${courseId}/lessons/${lessonId}`,
  assignment: (courseId: string, assignmentId: string) => `/student/courses/${courseId}/assignments/${assignmentId}`,
};
