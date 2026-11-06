import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { Box, ButtonBase, Link, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { useTranslation } from 'next-i18next/pages';
import { type Kind, workKind } from '@/libs/accent';
import { KindIcon } from '@/libs/components/KindIcon';
import type { StudentOverviewQuery } from '@/libs/gql/graphql';
import { daysUntil, studentHref } from './due';
import { STITCH, SoftPill, enter, pressSx } from './parts';
import { LESSON_ICON } from './ThisWeek';

type Overview = StudentOverviewQuery['studentOverview'];

/** A phone shows a short list; everything else is one tap away */
const MAX_ROWS = 3;

/** Section heading: title left, a muted note or link right (Stitch "My courses · Quarter 1 · 2026–27") */
export function Heading({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 1, px: 0.5, mb: 1.25 }}>
      <Typography component="h2" sx={{ fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
        {title}
      </Typography>
      {aside}
    </Stack>
  );
}

/** One tappable white row: icon tile, title, a muted line, an optional pill (the whole row is the link) */
export function TapRow({ href, kind, icon, title, detail, pill, index }: { href: string; kind: Kind; icon?: SvgIconComponent; title: string; detail: string; pill?: ReactNode; index: number }) {
  return (
    <ButtonBase
      component={NextLink}
      href={href}
      sx={{
        ...pressSx,
        width: '100%',
        justifyContent: 'flex-start',
        gap: 1.5,
        p: 1.5,
        borderRadius: '12px',
        bgcolor: '#fff',
        boxShadow: STITCH.rowShadow,
        textAlign: 'left',
        ...enter(index),
      }}
    >
      <KindIcon kind={kind} icon={icon} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography noWrap sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography noWrap sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
          {detail}
        </Typography>
      </Box>
      {pill}
    </ButtonBase>
  );
}

/**
 * Student home on a phone (DECISIONS §10): Stitch "Mobile Home" kept simple — the week, one "Up next"
 * list (overdue work first, then the lesson to continue and this week's work, three rows at most;
 * the rest is in the calendar) and the course list.
 */
export function MobileHome({ overview }: { overview: Overview }) {
  const { t } = useTranslation('student');
  const { period, overdue, courses } = overview;
  const pending = overview.upcoming.filter((u) => !u.isDone);
  const lesson = overview.continueLessons[0];
  const total = overdue.length + pending.length;

  const dueLabel = (dueAt: string) => {
    const days = daysUntil(dueAt);
    return days <= 0 ? t('home.thisWeek.dueToday') : days === 1 ? t('home.thisWeek.dueTomorrow') : t('home.thisWeek.dueIn', { count: days });
  };

  // The most urgent first: work past its deadline, the lesson in progress, then the week by date
  const LessonIcon = lesson && LESSON_ICON[lesson.type];
  const rows: { key: string; row: Omit<Parameters<typeof TapRow>[0], 'index'> }[] = [
    ...overdue.map((w) => ({
      key: w.assignmentId,
      row: {
        href: studentHref.assignment(w.courseId, w.assignmentId),
        kind: workKind(w.type),
        title: w.title,
        detail: w.courseTitle,
        pill: <SoftPill tone="peach">{t('home.upNext.overdue')}</SoftPill>,
      },
    })),
    ...(lesson && LessonIcon
      ? [
          {
            key: lesson.lessonId,
            row: {
              href: studentHref.lesson(lesson.courseId, lesson.lessonId),
              kind: 'lesson' as const,
              icon: LessonIcon,
              title: lesson.title,
              detail: `${lesson.subjectName} · ${t('home.thisWeek.continue')}`,
              pill: lesson.percent != null ? <SoftPill tone="mint">{lesson.percent}%</SoftPill> : <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />,
            },
          },
        ]
      : []),
    ...pending.map((w) => ({
      key: w.assignmentId,
      row: {
        href: studentHref.assignment(w.courseId, w.assignmentId),
        kind: workKind(w.type),
        title: w.title,
        detail: w.courseTitle,
        pill: <SoftPill tone={daysUntil(w.dueAt) <= 2 ? 'peach' : 'neutral'}>{dueLabel(w.dueAt)}</SoftPill>,
      },
    })),
  ].slice(0, MAX_ROWS);
  const coursesStart = rows.length;

  return (
    <Stack spacing={3}>
      {/* The name is in the spruce header already: only the week here */}
      {period && (
        <Box sx={{ px: 0.5 }}>
          <SoftPill tone="neutral">{`${period.name} · ${t('home.week', { week: period.week })}`}</SoftPill>
        </Box>
      )}

      <Box component="section">
        <Heading
          title={t('home.upNext.title')}
          aside={
            total > 0 && (
              <Link component={NextLink} href="/student/calendar" underline="none" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'secondary.main' }}>
                {t('home.upNext.all', { total })}
              </Link>
            )
          }
        />
        {rows.length === 0 ? (
          <Typography sx={{ px: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>{t('home.thisWeek.empty')}</Typography>
        ) : (
          <Stack spacing={1}>
            {rows.map(({ key, row }, i) => (
              <TapRow key={key} index={i} {...row} />
            ))}
          </Stack>
        )}
      </Box>

      <Box component="section">
        <Heading
          title={t('home.courses.title')}
          aside={
            <Link component={NextLink} href="/student/courses" underline="none" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'secondary.main' }}>
              {t('home.courses.all')}
            </Link>
          }
        />
        {courses.length === 0 ? (
          <Typography sx={{ px: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>{t('home.courses.empty')}</Typography>
        ) : (
          <Stack spacing={1}>
            {courses.map((c, i) => (
              // Stitch: a white card with a spruce stripe on the left, the class course name and the teacher
              <ButtonBase
                key={c.courseId}
                component={NextLink}
                href={studentHref.course(c.courseId)}
                sx={{
                  ...pressSx,
                  width: '100%',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  p: 2,
                  pl: 2.5,
                  borderRadius: '12px',
                  bgcolor: '#fff',
                  boxShadow: STITCH.rowShadow,
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: 'primary.main' },
                  ...enter(coursesStart + i),
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    {c.title}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                    {c.teacherName ?? c.subjectName}
                  </Typography>
                </Box>
                {c.newCount > 0 && <SoftPill tone="mint">{t('home.courses.new', { count: c.newCount })}</SoftPill>}
              </ButtonBase>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
