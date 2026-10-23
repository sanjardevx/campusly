import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { Box, Button, Card, Stack, Typography } from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlineOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { useTranslation } from 'next-i18next/pages';
import type { StudentOverviewQuery } from '@/libs/gql/graphql';
import { daysUntil, formatDueAt, studentHref } from './due';
import { STITCH, SectionTitle, SoftPill, enter, liftSx, stretchedSx } from './parts';

type Overview = StudentOverviewQuery['studentOverview'];
type Lesson = Overview['continueLessons'][number];
type Work = Overview['upcoming'][number];

/** Stitch shows a short list; the rest is one click away in the courses */
const MAX_ROWS = 5;

const LESSON_ICON = { VIDEO: PlayCircleOutlineIcon, READING: ArticleOutlinedIcon, FILE: DescriptionOutlinedIcon, LINK: LinkOutlinedIcon };
const WORK_ICON = { HOMEWORK: AssignmentOutlinedIcon, QUIZ: TimerOutlinedIcon, EXAM: EventNoteOutlinedIcon };

/** One Stitch row: icon tile, title + pill, a muted line, the action on the right */
function Row({ icon, accent, title, pill, detail, action, index }: { icon: ReactNode; accent?: boolean; title: string; pill?: ReactNode; detail: string; action: ReactNode; index: number }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '12px',
        borderColor: STITCH.outline,
        boxShadow: STITCH.rowShadow,
        px: 2,
        py: 1.5,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        gap: 1.5,
        '&:hover': { borderColor: 'secondary.main' },
        // The action button stretches over the card: the whole row is clickable, so it may lift
        position: 'relative',
        ...liftSx,
        ...enter(index),
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: STITCH.surfaceContainer,
            color: accent ? 'secondary.main' : STITCH.onSurfaceVariant,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            '& svg': { fontSize: 20 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" sx={{ alignItems: 'center', columnGap: 1, rowGap: 0.5, flexWrap: 'wrap' }}>
            <Typography component="h3" sx={{ fontSize: '1rem', lineHeight: '1.5rem', fontWeight: 600 }}>
              {title}
            </Typography>
            {pill}
          </Stack>
          <Typography noWrap sx={{ fontSize: '0.84375rem', lineHeight: '1.375rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {detail}
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ alignSelf: { xs: 'flex-end', sm: 'center' }, flexShrink: 0 }}>{action}</Box>
    </Card>
  );
}

const buttonSx = { ...stretchedSx, px: 1.75, py: 0.75, borderRadius: 2, fontSize: '0.8125rem', fontWeight: 600, lineHeight: '1.125rem', minWidth: 0, boxShadow: 'none' };

/**
 * Stitch "This week" (DECISIONS §10), at most 5 rows: the last lesson started (Continue), then work
 * due in the next 7 days not handed in yet. Overdue work has its own To Do card.
 */
export function ThisWeek({ lessons, upcoming, index }: { lessons: Lesson[]; upcoming: Work[]; index: number }) {
  const { t } = useTranslation('student');
  const { locale } = useRouter();
  const pending = upcoming.filter((u) => !u.isDone);
  const lesson = lessons[0];

  const work = pending.slice(0, MAX_ROWS - (lesson ? 1 : 0));

  const duePill = (w: Work) => {
    const days = daysUntil(w.dueAt);
    const label = days <= 0 ? t('home.thisWeek.dueToday') : days === 1 ? t('home.thisWeek.dueTomorrow') : t('home.thisWeek.dueIn', { count: days });
    // Peach only when the deadline is close (≤ 2 days): it is the time-sensitive colour
    return <SoftPill tone={days <= 2 ? 'peach' : 'neutral'}>{label}</SoftPill>;
  };

  const minutes = lesson?.durationSec ? Math.max(1, Math.round(lesson.durationSec / 60)) : null;
  const LessonIcon = lesson && LESSON_ICON[lesson.type];

  return (
    <Box component="section" sx={enter(index)}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, pb: 0.5, mb: 2 }}>
        <SectionTitle title={t('home.thisWeek.title')} subtitle={t('home.thisWeek.subtitle')} />
        {pending.length > 0 && (
          <Box component="span" sx={{ bgcolor: STITCH.surfaceContainer, color: 'text.secondary', px: 1.25, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t('home.thisWeek.pending', { count: pending.length })}
          </Box>
        )}
      </Stack>

      {!lesson && work.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: '12px', borderColor: STITCH.outline, p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('home.thisWeek.empty')}
          </Typography>
        </Card>
      ) : (
        <Stack spacing={1.25}>
          {lesson && LessonIcon && (
            <Row
              index={index + 1}
              accent
              icon={<LessonIcon />}
              title={lesson.title}
              pill={lesson.percent != null && <SoftPill tone="mint">{t('home.thisWeek.watched', { percent: lesson.percent })}</SoftPill>}
              detail={[lesson.subjectName, minutes && t('home.thisWeek.minutes', { count: minutes })].filter(Boolean).join(' · ')}
              action={
                <Button
                  component={NextLink}
                  href={studentHref.lesson(lesson.courseId, lesson.lessonId)}
                  variant="contained"
                  startIcon={<PlayArrowRoundedIcon />}
                  sx={{ ...buttonSx, bgcolor: STITCH.ink, '&:hover': { bgcolor: 'primary.main', boxShadow: 'none' }, '& .MuiButton-startIcon': { mr: 0.5 } }}
                >
                  {t('home.thisWeek.continue')}
                </Button>
              }
            />
          )}
          {work.map((w, i) => {
            const Icon = WORK_ICON[w.type];
            const when = formatDueAt(w.dueAt, locale);
            return (
              <Row
                key={w.assignmentId}
                index={index + 2 + i}
                icon={<Icon />}
                title={w.title}
                pill={duePill(w)}
                detail={`${w.courseTitle} · ${t('home.thisWeek.dueAt', { date: when })}`}
                action={
                  <Button
                    component={NextLink}
                    href={studentHref.assignment(w.courseId, w.assignmentId)}
                    variant="outlined"
                    color="inherit"
                    sx={{ ...buttonSx, borderColor: 'rgba(192, 200, 196, 0.6)', '&:hover': { bgcolor: STITCH.surfaceContainer, borderColor: 'rgba(192, 200, 196, 0.6)' } }}
                  >
                    {w.type === 'EXAM' ? t('home.thisWeek.view') : w.type === 'QUIZ' ? t('home.thisWeek.startQuiz') : t('home.thisWeek.submit')}
                  </Button>
                }
              />
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
