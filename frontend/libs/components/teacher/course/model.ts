import type { CourseAssignmentsQuery, TeacherCourseQuery } from '@/libs/gql/graphql';

export type CourseData = TeacherCourseQuery['courseDetail'];
export type Week = CourseData['modules'][number];
export type Lesson = Week['lessons'][number];
export type Assignment = CourseAssignmentsQuery['courseAssignments'][number];
export type CourseFile = NonNullable<Lesson['file']>;

/** A row of a week: lessons first (their own order), then assignments by due date (DECISIONS) */
export type WeekItem = { kind: 'lesson'; lesson: Lesson } | { kind: 'assignment'; assignment: Assignment };

/** null = draft; in the future = scheduled; otherwise visible to students */
export type Visibility = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';

export function visibility(publishedAt: string | null | undefined): Visibility {
  if (!publishedAt) return 'DRAFT';
  return new Date(publishedAt) > new Date() ? 'SCHEDULED' : 'PUBLISHED';
}

/** "2026-10-23" in the viewer's own calendar (local date, never UTC midnight) */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type WeekState = 'CURRENT' | 'PAST' | 'FUTURE' | 'UNDATED';

export function weekState(week: Pick<Week, 'startsAt' | 'endsAt'>, today = todayLocal()): WeekState {
  if (!week.startsAt || !week.endsAt) return 'UNDATED';
  if (week.endsAt < today) return 'PAST';
  if (week.startsAt > today) return 'FUTURE';
  return 'CURRENT';
}

/** "2026-10-13" → a local Date */
export const dayDate = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** "Oct 13 – Oct 19" (Uzbek: "13.10 – 19.10", browsers lack Uzbek month names) */
export function dayRange(start: string, end: string, locale = 'en'): string {
  const fmt = (day: string) => {
    const d = dayDate(day);
    if (locale === 'uz') return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d);
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

/** "1.8 MB" · "320 KB" */
export function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** "application/pdf" → "PDF" (the extension people know) */
export function fileType(mimeType: string): string {
  const known: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WEBP',
    'video/mp4': 'MP4',
  };
  return known[mimeType] ?? mimeType.split('/')[1]?.toUpperCase() ?? 'FILE';
}

/** Items of one week, in page order */
export function weekItems(week: Week, assignments: Assignment[]): WeekItem[] {
  const own = assignments
    .filter((a) => a.moduleId === week.id)
    .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'));
  return [
    ...week.lessons.map((lesson) => ({ kind: 'lesson' as const, lesson })),
    ...own.map((assignment) => ({ kind: 'assignment' as const, assignment })),
  ];
}
