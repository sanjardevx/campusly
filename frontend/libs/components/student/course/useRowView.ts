import type { SvgIconComponent } from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next/pages';
import { daysUntil, formatDueAt, studentHref } from '@/libs/components/student/home/due';
import { type Kind, workKind } from '@/libs/accent';
import { LESSON_ICON } from '@/libs/components/student/home/ThisWeek';
import { fileType, formatSize } from '@/libs/components/teacher/course/model';
import type { Row } from './model';

type Tone = 'mint' | 'peach' | 'neutral';

/** What a row shows, the same on the desktop week card and the phone list */
export interface RowView {
  key: string;
  /** Colour and default icon from the kind map; lessons pick their icon by content */
  kind: Kind;
  icon?: SvgIconComponent;
  title: string;
  meta: string;
  /** Due soon or overdue: the meta line turns ochre (time-sensitive, DECISIONS §13) */
  urgent: boolean;
  pill: { tone: Tone; label: string };
  action: { label: string; href: string; primary: boolean };
}

export function useRowView(courseId: string) {
  const { t } = useTranslation('student');
  const { locale } = useRouter();

  return (row: Row): RowView => {
    if (row.kind === 'lesson') {
      const { lesson, state } = row;
      const status = state?.status ?? 'NOT_STARTED';
      const duration = lesson.file?.durationSec;
      const meta =
        lesson.type === 'VIDEO' && duration
          ? t('course.minutes', { count: Math.max(1, Math.round(duration / 60)) })
          : lesson.type === 'FILE' && lesson.file
            ? `${fileType(lesson.file.mimeType)} · ${formatSize(lesson.file.size)}`
            : t(`course.kind.${lesson.type}`);
      const watching = lesson.type === 'VIDEO' && status === 'IN_PROGRESS';
      return {
        key: lesson.id,
        kind: 'lesson',
        icon: LESSON_ICON[lesson.type],
        title: lesson.title,
        meta,
        urgent: false,
        pill:
          watching && state?.percent != null
            ? { tone: 'mint', label: t('course.lesson.watched', { percent: state.percent }) }
            : { tone: status === 'COMPLETED' ? 'mint' : 'neutral', label: t(`course.lesson.${status}`) },
        action: {
          label: lesson.type === 'VIDEO' ? t(watching ? 'course.action.resume' : 'course.action.watch') : t('course.action.open'),
          href: studentHref.lesson(courseId, lesson.id),
          // The one thing to do next in a row is filled; the rest are quiet
          primary: watching,
        },
      };
    }

    const { assignment: a, state } = row;
    const status = state?.status ?? null;
    const handedIn = status === 'SUBMITTED' || status === 'LATE' || status === 'GRADED';
    const days = a.dueAt ? daysUntil(a.dueAt) : null;
    const open = !handedIn && a.type !== 'EXAM' && !a.gradesPublishedAt;
    const urgent = open && days !== null && days <= 2;
    const score = state?.score != null ? `${state.score} / ${a.maxScore}` : null;

    let pill: RowView['pill'];
    if (a.type === 'EXAM') pill = score ? { tone: 'mint', label: score } : { tone: 'neutral', label: t('course.work.exam') };
    else if (status === 'GRADED' || status === 'MISSING') pill = { tone: status === 'GRADED' ? 'mint' : 'peach', label: score ?? t(`course.work.${status}`) };
    else if (status === 'SUBMITTED' || status === 'LATE') pill = { tone: 'mint', label: t(`course.work.${status}`) };
    else if (status === 'RETURNED') pill = { tone: 'peach', label: t('course.work.RETURNED') };
    else pill = { tone: urgent ? 'peach' : 'neutral', label: t('course.work.none') };

    return {
      key: a.id,
      kind: workKind(a.type),
      title: a.title,
      meta: a.dueAt ? t('course.dueAt', { date: formatDueAt(a.dueAt, locale) }) : t('course.noDue'),
      urgent,
      pill,
      action: {
        label: !open ? t('course.action.view') : a.type === 'QUIZ' ? t('course.action.startQuiz') : t('course.action.submit'),
        href: studentHref.assignment(courseId, a.id),
        primary: open,
      },
    };
  };
}
