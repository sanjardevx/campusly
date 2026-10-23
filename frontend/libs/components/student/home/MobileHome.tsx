import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { Box, ButtonBase, Link, Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { useTranslation } from 'next-i18next/pages';
import type { StudentOverviewQuery } from '@/libs/gql/graphql';
import { daysUntil, formatDueAt, studentHref } from './due';
import { STITCH, SoftPill, enter, pressSx } from './parts';
import { LESSON_ICON, WORK_ICON } from './ThisWeek';

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
export function TapRow({ href, icon, title, detail, pill, index }: { href: string; icon: ReactNode; title: string; detail: string; pill?: ReactNode; index: number }) {
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
      <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: STITCH.surfaceContainer, color: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, '& svg': { fontSize: 20 } }}>
        {icon}
      </Box>
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
 * Student home on a phone (DECISIONS §10): Stitch "Mobile Home" kept simple — a status line, overdue
 * work, this week's short list and the course list. The calendar stays on the wide screen.
 */
export function MobileHome({ overview }: { overview: Overview }) {
  const { t } = useTranslation('student');
  const { locale } = useRouter();
  const { period, overdue, courses } = overview;
  const pending = overview.upcoming.filter((u) => !u.isDone);
  const lesson = overview.continueLessons[0];
  const week = pending.slice(0, MAX_ROWS - (lesson ? 1 : 0));

  const dueLabel = (dueAt: string) => {
    const days = daysUntil(dueAt);
    return days <= 0 ? t('home.thisWeek.dueToday') : days === 1 ? t('home.thisWeek.dueTomorrow') : t('home.thisWeek.dueIn', { count: days });
  };

  // Entrance order down the page: overdue, the lesson, this week, then the courses
  const LessonIcon = lesson && LESSON_ICON[lesson.type];
  const weekStart = overdue.length + (lesson ? 1 : 0);
  const coursesStart = weekStart + week.length;

  return (
    <Stack spacing={3}>
      {/* The name is in the spruce header already: one status line instead of the greeting */}
      <Typography sx={{ px: 0.5, fontSize: '0.8125rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
        {[period && `${period.name} · ${t('home.week', { week: period.week })}`, pending.length > 0 ? t('home.dueThisWeek', { count: pending.length }) : t('home.nothingDue')]
          .filter(Boolean)
          .join(' · ')}
      </Typography>

      {overdue.length > 0 && (
        <Box component="section">
          <Heading title={t('home.todo.title')} aside={<SoftPill tone="peach">{overdue.length}</SoftPill>} />
          <Stack spacing={1}>
            {overdue.map((w, i) => {
              const Icon = WORK_ICON[w.type];
              return (
                <TapRow
                  key={w.assignmentId}
                  index={i}
                  href={studentHref.assignment(w.courseId, w.assignmentId)}
                  icon={<Icon />}
                  title={w.title}
                  detail={`${w.courseTitle} · ${t('home.todo.wasDue', { date: formatDueAt(w.dueAt, locale) })}`}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      <Box component="section">
        <Heading title={t('home.thisWeek.title')} aside={pending.length > 0 && <SoftPill tone="neutral">{t('home.thisWeek.pending', { count: pending.length })}</SoftPill>} />
        {!lesson && week.length === 0 ? (
          <Typography sx={{ px: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>{t('home.thisWeek.empty')}</Typography>
        ) : (
          <Stack spacing={1}>
            {lesson && LessonIcon && (
              <TapRow
                index={overdue.length}
                href={studentHref.lesson(lesson.courseId, lesson.lessonId)}
                icon={<LessonIcon />}
                title={lesson.title}
                detail={`${lesson.subjectName} · ${t('home.thisWeek.continue')}`}
                pill={lesson.percent != null ? <SoftPill tone="mint">{lesson.percent}%</SoftPill> : <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />}
              />
            )}
            {week.map((w, i) => {
              const Icon = WORK_ICON[w.type];
              const days = daysUntil(w.dueAt);
              return (
                <TapRow
                  key={w.assignmentId}
                  index={weekStart + i}
                  href={studentHref.assignment(w.courseId, w.assignmentId)}
                  icon={<Icon />}
                  title={w.title}
                  detail={w.courseTitle}
                  pill={<SoftPill tone={days <= 2 ? 'peach' : 'neutral'}>{dueLabel(w.dueAt)}</SoftPill>}
                />
              );
            })}
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
