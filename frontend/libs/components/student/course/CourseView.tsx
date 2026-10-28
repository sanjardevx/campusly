import { useRef, useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, Link, Stack, Tab, Tabs, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import { useTranslation } from 'next-i18next/pages';
import { studentHref } from '@/libs/components/student/home/due';
import { ProgressBar, STITCH, SoftPill, enter, pressSx } from '@/libs/components/student/home/parts';
import { dayRange } from '@/libs/components/teacher/course/model';
import type { StudentCourseQuery } from '@/libs/gql/graphql';
import { arrangeWeeks, isDone, revealOpened, rowsOf, topicOf, type Row, type StudentWeek } from './model';
import { useRowView, type RowView } from './useRowView';

/** "Q&A" and "Announcements" next to the tabs */
const linkSx = { display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', '&:hover': { color: STITCH.ink } };

/** Stitch "Algebra · Grade 9A (eCampus View)" on a wide screen (DECISIONS §10) */
export function CourseView({ data }: { data: StudentCourseQuery }) {
  const { t } = useTranslation('student');
  const [tab, setTab] = useState<'lessons' | 'assignments'>('lessons');
  const { courseDetail: course, courseAssignments: assignments, courseProgress: progress } = data;
  const { current, isCurrent, others } = arrangeWeeks(course.modules);
  const owner = course.teachers.find((x) => x.role === 'OWNER') ?? course.teachers[0];
  // Still to hand in (an offline exam has nothing to hand in; published grades close the work)
  const toDo = assignments.filter((a) => {
    const status = progress.assignments.find((s) => s.assignmentId === a.id)?.status;
    return a.type !== 'EXAM' && !a.gradesPublishedAt && (!status || status === 'DRAFT' || status === 'RETURNED');
  }).length;
  const rows = (week: StudentWeek) => rowsOf(week, assignments, progress);

  // Every assignment of the course, by due date (also those outside any week)
  const allWork: Row[] = [...assignments]
    .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'))
    .map((assignment) => ({ kind: 'assignment', assignment, state: progress.assignments.find((s) => s.assignmentId === assignment.id) }));

  return (
    <Box>
      <Stack spacing={2.5} sx={{ pb: 2.5 }}>
        {/* Breadcrumb + the current week */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, fontSize: '0.8125rem', fontWeight: 600 }}>
            <Link component={NextLink} href="/student/courses" underline="none" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
              <ArrowBackRoundedIcon sx={{ fontSize: 16 }} />
              {t('course.back')}
            </Link>
            <Box component="span" sx={{ color: '#C0C8C4' }}>
              /
            </Box>
            <Box component="span" sx={{ color: STITCH.ink }}>
              {course.title}
            </Box>
          </Stack>
          {current && isCurrent && <SoftPill tone="neutral">{t('course.week', { week: current.order })}</SoftPill>}
        </Stack>

        {/* Header card: subject, teacher, course progress */}
        <Card
          variant="outlined"
          sx={{ borderRadius: '12px', borderColor: STITCH.outline, boxShadow: STITCH.rowShadow, p: 2.5, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2, ...enter(0) }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', gap: 2, minWidth: 0 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>
              {course.subjectName.slice(0, 2)}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h1" sx={{ fontSize: '1.5rem', lineHeight: '2rem', fontWeight: 600, letterSpacing: '-0.015em', color: STITCH.ink }}>
                {course.title}
              </Typography>
              {owner && (
                <Typography sx={{ fontSize: '0.84375rem', color: 'text.secondary' }}>
                  {t('course.instructor')}:{' '}
                  <Box component="strong" sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {owner.firstName} {owner.lastName}
                  </Box>
                </Typography>
              )}
            </Box>
          </Stack>
          <Box sx={{ bgcolor: '#EFF5F0', borderRadius: 2, px: 1.75, py: 1, minWidth: 200 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, mb: 0.75, fontSize: '0.75rem', fontWeight: 600 }}>
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {t('course.progress')}
              </Box>
              <Box component="span" sx={{ color: STITCH.ink, fontVariantNumeric: 'tabular-nums' }}>
                {progress.progress == null ? t('course.noLessons') : t('course.complete', { percent: progress.progress })}
              </Box>
            </Stack>
            <ProgressBar value={progress.progress ?? 0} label={t('course.progress')} />
          </Box>
        </Card>

        {/* Tabs + course links */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, borderBottom: 1, borderColor: STITCH.outlineSoft, flexWrap: 'wrap' }}>
          <Tabs
            value={tab}
            onChange={(_, v: 'lessons' | 'assignments') => setTab(v)}
            sx={{ minHeight: 0, '& .MuiTab-root': { minHeight: 0, px: 0, py: 1.25, mr: 3, minWidth: 0, textTransform: 'none', fontSize: '1rem', fontWeight: 600 }, '& .MuiTabs-indicator': { bgcolor: STITCH.ink, height: 2, borderRadius: 1 } }}
          >
            <Tab value="lessons" label={t('course.tabs.lessons')} />
            <Tab
              value="assignments"
              label={
                <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
                  {t('course.tabs.assignments')}
                  {toDo > 0 && <SoftPill tone="neutral">{toDo}</SoftPill>}
                </Stack>
              }
            />
          </Tabs>
          <Stack direction="row" sx={{ gap: 2.5 }}>
            <Link component={NextLink} href={studentHref.questions(course.id)} underline="none" sx={linkSx}>
              <ForumOutlinedIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
              {t('course.qa')}
            </Link>
            <Link component={NextLink} href="/student/announcements" underline="none" sx={linkSx}>
              <CampaignOutlinedIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
              {t('course.announcements')}
            </Link>
          </Stack>
        </Stack>
      </Stack>

      {tab === 'lessons' ? (
        course.modules.length === 0 ? (
          <Empty text={t('course.empty')} />
        ) : (
          <Stack spacing={3}>
            {current && <WeekCard week={current} rows={rows(current)} courseId={course.id} isCurrent={isCurrent} accent index={1} />}
            {others.length > 0 && (
              <Stack spacing={1.25}>
                <Typography sx={{ px: 0.5, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
                  {t('course.earlier')}
                </Typography>
                {others.map((week, i) => (
                  <EarlierWeek key={week.id} week={week} rows={rows(week)} courseId={course.id} index={2 + i} />
                ))}
              </Stack>
            )}
          </Stack>
        )
      ) : allWork.length === 0 ? (
        <Empty text={t('course.noAssignments')} />
      ) : (
        <ListCard index={1}>
          <RowList rows={allWork} courseId={course.id} />
        </ListCard>
      )}
    </Box>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', borderColor: STITCH.outline, p: 4, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Card>
  );
}

function ListCard({ children, index, accent }: { children: ReactNode; index: number; accent?: boolean }) {
  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: '12px', borderColor: STITCH.outline, boxShadow: STITCH.rowShadow, overflow: 'hidden', ...(accent && { borderLeft: `4px solid ${STITCH.ink}` }), ...enter(index) }}
    >
      {children}
    </Card>
  );
}

/** A week the student works in: header (week, dates, topic) and its rows */
function WeekCard({ week, rows, courseId, isCurrent, accent, index }: { week: StudentWeek; rows: Row[]; courseId: string; isCurrent?: boolean; accent?: boolean; index: number }) {
  const { t } = useTranslation('student');
  const { locale } = useRouter();
  return (
    <ListCard index={index} accent={accent}>
      <Stack
        direction="row"
        sx={{ px: 2.5, py: 1.5, bgcolor: '#EFF5F0', borderBottom: 1, borderColor: STITCH.outlineSoft, alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
          <CalendarTodayOutlinedIcon sx={{ fontSize: 20, color: STITCH.ink }} />
          <Typography component="h2" sx={{ fontSize: '1.0625rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {[t('course.week', { week: week.order }), week.startsAt && week.endsAt && dayRange(week.startsAt, week.endsAt, locale)].filter(Boolean).join(' · ')}
            {isCurrent && (
              <Box component="span" sx={{ ml: 1, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: STITCH.ink }}>
                ({t('course.current')})
              </Box>
            )}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}>{topicOf(week)}</Typography>
      </Stack>
      {rows.length === 0 ? <Typography sx={{ px: 2.5, py: 2, fontSize: '0.84375rem', color: 'text.secondary' }}>{t('course.weekEmpty')}</Typography> : <RowList rows={rows} courseId={courseId} />}
    </ListCard>
  );
}

/** Rows split by thin rules; the action stretches over its row, so the whole row opens it */
function RowList({ rows, courseId }: { rows: Row[]; courseId: string }) {
  const view = useRowView(courseId);
  return (
    <Box sx={{ bgcolor: '#fff', '& > * + *': { borderTop: 1, borderColor: STITCH.outlineSoft } }}>
      {rows.map((row) => (
        <RowLine key={row.kind === 'lesson' ? row.lesson.id : row.assignment.id} v={view(row)} />
      ))}
    </Box>
  );
}

function RowLine({ v }: { v: RowView }) {
  return (
    <Stack
      direction="row"
      sx={{
        position: 'relative',
        px: 2.5,
        py: 1.5,
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        transition: 'background-color 150ms ease',
        '@media (hover: hover) and (pointer: fine)': { '&:hover': { bgcolor: '#F7FAF8' } },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <Box sx={{ color: v.accent ? 'secondary.main' : STITCH.onSurfaceVariant, display: 'flex', flexShrink: 0, '& svg': { fontSize: 22 } }}>
          <v.Icon />
        </Box>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, minWidth: 0, flexWrap: 'wrap' }}>
          <Typography noWrap sx={{ fontSize: '1rem', fontWeight: 500 }}>
            {v.title}
          </Typography>
          <Box component="span" sx={{ color: '#C0C8C4', fontSize: '0.75rem' }}>
            •
          </Box>
          <Typography noWrap sx={{ fontSize: '0.84375rem', fontWeight: v.urgent ? 500 : 400, color: v.urgent ? 'warning.dark' : 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {v.meta}
          </Typography>
        </Stack>
      </Stack>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <SoftPill tone={v.pill.tone}>{v.pill.label}</SoftPill>
        <Button
          component={NextLink}
          href={v.action.href}
          size="small"
          variant={v.action.primary ? 'contained' : 'text'}
          sx={{
            ...pressSx,
            px: 1.5,
            py: 0.5,
            minWidth: 0,
            borderRadius: 1.5,
            fontSize: '0.75rem',
            fontWeight: 600,
            boxShadow: 'none',
            ...(v.action.primary ? { bgcolor: STITCH.ink, '&:hover': { bgcolor: 'primary.main', boxShadow: 'none' } } : { bgcolor: STITCH.surfaceContainer, color: STITCH.ink, '&:hover': { bgcolor: '#E4EAE5' } }),
            // Stretched link: the whole row opens the same page
            '&::after': { content: '""', position: 'absolute', inset: 0 },
          }}
        >
          {v.action.label}
        </Button>
      </Stack>
    </Stack>
  );
}

/** Any other week: one line with "N/N done", rows on demand (scrolled into view when opened) */
function EarlierWeek({ week, rows, courseId, index }: { week: StudentWeek; rows: Row[]; courseId: string; index: number }) {
  const { t } = useTranslation('student');
  const box = useRef<HTMLDivElement>(null);
  const { locale } = useRouter();
  const done = rows.filter(isDone).length;
  const all = rows.length > 0 && done === rows.length;
  return (
    <Accordion
      ref={box}
      disableGutters
      elevation={0}
      slotProps={{ transition: { onEntered: () => revealOpened(box.current) } }}
      sx={{ borderRadius: '10px !important', border: 1, borderColor: STITCH.outline, boxShadow: STITCH.rowShadow, overflow: 'hidden', '&::before': { display: 'none' }, ...enter(index) }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 2, '& .MuiAccordionSummary-content': { my: 1.25, alignItems: 'center', gap: 1.5, minWidth: 0 } }}>
        {all ? <CheckCircleRoundedIcon sx={{ fontSize: 20, color: 'secondary.main' }} /> : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />}
        <Typography noWrap sx={{ flex: 1, fontSize: '1rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          {[t('course.week', { week: week.order }), week.startsAt && week.endsAt && dayRange(week.startsAt, week.endsAt, locale), topicOf(week)].filter(Boolean).join(' · ')}
        </Typography>
        <Typography sx={{ flexShrink: 0, mr: 1, fontSize: '0.75rem', fontWeight: 600, color: all ? 'secondary.main' : 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
          {t('course.done', { done, total: rows.length })}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0, borderTop: 1, borderColor: STITCH.outlineSoft }}>
        {rows.length === 0 ? <Typography sx={{ px: 2.5, py: 2, fontSize: '0.84375rem', color: 'text.secondary' }}>{t('course.weekEmpty')}</Typography> : <RowList rows={rows} courseId={courseId} />}
      </AccordionDetails>
    </Accordion>
  );
}
