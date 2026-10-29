import { useRef, useState } from 'react';
import NextLink from 'next/link';
import { Box, Button, ButtonBase, Collapse, Stack, Tab, Tabs, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { useTranslation } from 'next-i18next/pages';
import { studentHref } from '@/libs/components/student/home/due';
import { Heading, TapRow } from '@/libs/components/student/home/MobileHome';
import { ProgressBar, STITCH, SoftPill } from '@/libs/components/student/home/parts';
import type { StudentCourseQuery } from '@/libs/gql/graphql';
import { arrangeWeeks, isDone, revealOpened, rowsOf, topicOf, type Row, type StudentWeek } from './model';
import { useRowView } from './useRowView';

/** The course on a phone: kept simple like the phone home — a short header, two tabs, tappable rows */
export function MobileCourse({ data }: { data: StudentCourseQuery }) {
  const { t } = useTranslation('student');
  const [tab, setTab] = useState<'lessons' | 'assignments'>('lessons');
  const { courseDetail: course, courseAssignments: assignments, courseProgress: progress } = data;
  const { current, isCurrent, others } = arrangeWeeks(course.modules);
  const owner = course.teachers.find((x) => x.role === 'OWNER') ?? course.teachers[0];
  const rows = (week: StudentWeek) => rowsOf(week, assignments, progress);
  const allWork: Row[] = [...assignments]
    .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'))
    .map((assignment) => ({ kind: 'assignment', assignment, state: progress.assignments.find((s) => s.assignmentId === assignment.id) }));

  return (
    <Stack spacing={2.5}>
      <Box sx={{ px: 0.5 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Typography component="h1" sx={{ fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.015em', color: STITCH.ink }}>
            {course.title}
          </Typography>
          <Button component={NextLink} href={studentHref.questions(course.id)} size="small" startIcon={<ForumOutlinedIcon />} sx={{ color: 'secondary.main', fontWeight: 600, flexShrink: 0 }}>
            {t('course.qa')}
          </Button>
        </Stack>
        {owner && (
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            {owner.firstName} {owner.lastName}
          </Typography>
        )}
        <Stack direction="row" sx={{ mt: 1.5, mb: 0.75, justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {t('course.progress')}
          </Box>
          <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {progress.progress == null ? t('course.noLessons') : t('course.complete', { percent: progress.progress })}
          </Box>
        </Stack>
        <ProgressBar value={progress.progress ?? 0} label={t('course.progress')} />
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v: 'lessons' | 'assignments') => setTab(v)}
        variant="fullWidth"
        sx={{ minHeight: 0, borderBottom: 1, borderColor: STITCH.outlineSoft, '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 600 }, '& .MuiTabs-indicator': { bgcolor: STITCH.ink } }}
      >
        <Tab value="lessons" label={t('course.tabs.lessons')} />
        <Tab value="assignments" label={t('course.tabs.assignments')} />
      </Tabs>

      {tab === 'assignments' ? (
        <RowStack rows={allWork} courseId={course.id} empty={t('course.noAssignments')} />
      ) : course.modules.length === 0 ? (
        <Typography sx={{ px: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>{t('course.empty')}</Typography>
      ) : (
        <>
          {[current].filter((w): w is StudentWeek => !!w).map((week) => (
            <Box component="section" key={week.id}>
              <Heading
                title={t('course.week', { week: week.order })}
                aside={week === current && isCurrent ? <SoftPill tone="mint">{t('course.current')}</SoftPill> : <Typography noWrap sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{topicOf(week)}</Typography>}
              />
              <RowStack rows={rows(week)} courseId={course.id} empty={t('course.weekEmpty')} />
            </Box>
          ))}
          {others.length > 0 && (
            <Box component="section">
              <Heading title={t('course.earlier')} />
              <Stack spacing={1}>
                {others.map((week) => (
                  <EarlierWeek key={week.id} week={week} rows={rows(week)} courseId={course.id} />
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}
    </Stack>
  );
}

function RowStack({ rows, courseId, empty }: { rows: Row[]; courseId: string; empty: string }) {
  const view = useRowView(courseId);
  if (rows.length === 0) return <Typography sx={{ px: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>{empty}</Typography>;
  return (
    <Stack spacing={1}>
      {rows.map((row, i) => {
        const v = view(row);
        return <TapRow key={v.key} index={i} href={v.action.href} kind={v.kind} icon={v.icon} title={v.title} detail={v.meta} pill={<SoftPill tone={v.pill.tone}>{v.pill.label}</SoftPill>} />;
      })}
    </Stack>
  );
}

/** A finished week: one tappable line with "N/N done"; its rows open below */
function EarlierWeek({ week, rows, courseId }: { week: StudentWeek; rows: Row[]; courseId: string }) {
  const { t } = useTranslation('student');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const done = rows.filter(isDone).length;
  return (
    <Box ref={box}>
      <ButtonBase
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        sx={{ width: '100%', justifyContent: 'space-between', gap: 1.5, p: 1.75, borderRadius: '12px', bgcolor: '#fff', boxShadow: STITCH.rowShadow, textAlign: 'left' }}
      >
        <Typography noWrap sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>
          {t('course.week', { week: week.order })} · {topicOf(week)}
        </Typography>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'secondary.main', fontVariantNumeric: 'tabular-nums' }}>{t('course.done', { done, total: rows.length })}</Typography>
          <ExpandMoreRoundedIcon sx={{ color: 'text.secondary', transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'none' }} />
        </Stack>
      </ButtonBase>
      <Collapse in={open} unmountOnExit onEntered={() => revealOpened(box.current, 16, 104)}>
        <Box sx={{ pt: 1 }}>
          <RowStack rows={rows} courseId={courseId} empty={t('course.weekEmpty')} />
        </Box>
      </Collapse>
    </Box>
  );
}
