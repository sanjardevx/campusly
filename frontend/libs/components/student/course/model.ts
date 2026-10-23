import type { StudentCourseQuery } from '@/libs/gql/graphql';
import { weekState } from '@/libs/components/teacher/course/model';

export type StudentCourse = StudentCourseQuery['courseDetail'];
export type StudentWeek = StudentCourse['modules'][number];
export type StudentLesson = StudentWeek['lessons'][number];
export type StudentAssignment = StudentCourseQuery['courseAssignments'][number];
export type LessonState = StudentCourseQuery['courseProgress']['lessons'][number];
export type WorkState = StudentCourseQuery['courseProgress']['assignments'][number];

/** One row of a week: the lesson or assignment with this student's state */
export type Row =
  | { kind: 'lesson'; lesson: StudentLesson; state: LessonState | undefined }
  | { kind: 'assignment'; assignment: StudentAssignment; state: WorkState | undefined };

/** Lessons first (their own order), then the week's assignments by due date — like the teacher page */
export function rowsOf(week: StudentWeek, assignments: StudentAssignment[], data: StudentCourseQuery['courseProgress']): Row[] {
  const lessonState = new Map(data.lessons.map((l) => [l.lessonId, l]));
  const workState = new Map(data.assignments.map((a) => [a.assignmentId, a]));
  const own = assignments
    .filter((a) => a.moduleId === week.id)
    .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'));
  return [
    ...week.lessons.map((lesson) => ({ kind: 'lesson' as const, lesson, state: lessonState.get(lesson.id) })),
    ...own.map((assignment) => ({ kind: 'assignment' as const, assignment, state: workState.get(assignment.id) })),
  ];
}

/** Handed in (or graded): counts as done in "N/N done"; an exam is done once it has a score */
export function isDone(row: Row): boolean {
  if (row.kind === 'lesson') return row.state?.status === 'COMPLETED';
  const status = row.state?.status;
  if (row.assignment.type === 'EXAM') return row.state?.score != null;
  return status === 'SUBMITTED' || status === 'LATE' || status === 'GRADED';
}

/**
 * Page order (DECISIONS §10): the week to work in is pinned on top — today's week, or between weeks
 * (weekend, holiday, after the last week) the latest started one — and it moves by itself when a
 * new week starts. Every other week follows in course order (Week 1, 2, 3 …), collapsed.
 */
export function arrangeWeeks(weeks: StudentWeek[]) {
  const sorted = [...weeks].sort((a, b) => a.order - b.order);
  const today = sorted.find((w) => weekState(w) === 'CURRENT') ?? null;
  const latest = today ?? sorted.filter((w) => weekState(w) === 'PAST').at(-1) ?? null;
  return { current: latest, isCurrent: !!today, others: sorted.filter((w) => w !== latest) };
}

/**
 * After a week opens: if its rows end below the screen (or under the phone's floating tab bar),
 * scroll so the week's header sits under the top bar (a jump when the OS asks for reduced motion).
 */
export function revealOpened(el: HTMLElement | null, topBar = 80, bottomBar = 0) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (rect.bottom <= window.innerHeight - bottomBar) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: window.scrollY + rect.top - topBar, behavior: reduce ? 'auto' : 'smooth' });
}

/** The week's topic without a repeated "Week 7:" at the start (the header already says the week) */
export const topicOf = (week: Pick<StudentWeek, 'title'>) => week.title.replace(/^week\s*\d+\s*[:·.\-–]\s*/i, '').trim() || week.title;
