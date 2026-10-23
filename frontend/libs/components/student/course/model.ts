import type { StudentCourseQuery } from '@/libs/gql/graphql';
import { weekState, type WeekState } from '@/libs/components/teacher/course/model';

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
 * Page order (DECISIONS §10): the week to work in first, then later weeks the teacher already opened
 * and undated ones in course order, then earlier weeks (most recent first, collapsed).
 * Between weeks (a weekend, a holiday, after the last week) the latest started week stays open,
 * so the page never opens with everything folded; `isCurrent` says whether today is inside it.
 */
export function arrangeWeeks(weeks: StudentWeek[]) {
  const withState = [...weeks].sort((a, b) => a.order - b.order).map((w) => ({ week: w, state: weekState(w) as WeekState }));
  const past = withState.filter((w) => w.state === 'PAST').map((w) => w.week);
  const today = withState.find((w) => w.state === 'CURRENT')?.week ?? null;
  const latest = today ?? past.at(-1) ?? null;
  return {
    current: latest,
    isCurrent: !!today,
    open: withState.filter((w) => w.state === 'FUTURE' || w.state === 'UNDATED').map((w) => w.week),
    earlier: past.filter((w) => w !== latest).reverse(),
  };
}

/** The week's topic without a repeated "Week 7:" at the start (the header already says the week) */
export const topicOf = (week: Pick<StudentWeek, 'title'>) => week.title.replace(/^week\s*\d+\s*[:·.\-–]\s*/i, '').trim() || week.title;
