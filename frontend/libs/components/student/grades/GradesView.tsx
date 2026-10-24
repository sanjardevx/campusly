import { Fragment, useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Box, ButtonBase, Card, Collapse, Link, Skeleton, Stack, Typography } from '@mui/material';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { useTranslation } from 'next-i18next/pages';
import { MY_PERIOD_GRADES } from '@/apollo/student/query';
import { formatInSchool, studentHref } from '@/libs/components/student/home/due';
import { STITCH, SoftPill, enter, pressSx } from '@/libs/components/student/home/parts';
import type { GradeItemState, MyGradesQuery } from '@/libs/gql/graphql';

type Grades = MyGradesQuery['myGrades'];
type CourseRow = Grades['courses'][number];
type Item = CourseRow['items'][number];

export const FINAL = 'final';

const pct = (n: number | null | undefined) => (n == null ? '—' : `${Number.isInteger(n) ? n : n.toFixed(1)}%`);

/** State pill tones: the score is the news (mint), what is still owed is ochre, the rest neutral */
const STATE_TONE: Record<GradeItemState, 'mint' | 'peach' | 'neutral'> = {
  GRADED: 'mint',
  SUBMITTED: 'mint',
  MISSING: 'peach',
  NOT_SUBMITTED: 'peach',
  DUE_SOON: 'peach',
  UPCOMING: 'neutral',
  NOT_GRADED: 'neutral',
};

/** Quarter tabs + Final (Stitch's segmented control) */
export function PeriodTabs({ periods, value, onChange }: { periods: Grades['periods']; value: string; onChange: (id: string) => void }) {
  const { t } = useTranslation('student');
  const tabs = [...periods.map((p) => ({ id: p.id, label: p.name })), { id: FINAL, label: t('grades.final') }];
  return (
    <Stack role="tablist" direction="row" sx={{ gap: 0.5, p: 0.5, borderRadius: 2, bgcolor: '#EFF5F0', border: 1, borderColor: STITCH.outline, overflowX: 'auto', maxWidth: '100%', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <ButtonBase
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            sx={{
              px: 1.75,
              py: 0.75,
              borderRadius: 1.5,
              whiteSpace: 'nowrap',
              fontSize: '0.84375rem',
              fontWeight: active ? 600 : 500,
              color: active ? STITCH.ink : 'text.secondary',
              bgcolor: active ? '#fff' : 'transparent',
              boxShadow: active ? STITCH.rowShadow : 'none',
              transition: 'background-color 150ms ease, color 150ms ease',
              '&:hover': { color: 'text.primary' },
            }}
          >
            {tab.label}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

/** "91.4%" with the 5-point mark beside it (DECISIONS §10) and "Not final" while it can change */
function GradeCell({ percent, mark, isFinal, align = 'right' }: { percent: number | null; mark: number | null; isFinal: boolean; align?: 'left' | 'right' }) {
  const { t } = useTranslation('student');
  return (
    <Stack sx={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start', gap: 0.25 }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 0.75 }}>
        <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: STITCH.ink, fontVariantNumeric: 'tabular-nums' }}>{pct(percent)}</Typography>
        {mark != null && (
          <Box component="span" sx={{ minWidth: 22, px: 0.75, borderRadius: 1, bgcolor: STITCH.surfaceContainer, fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', color: STITCH.ink }}>
            {mark}
          </Box>
        )}
      </Stack>
      {!isFinal && percent != null && <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary' }}>{t('grades.notFinal')}</Typography>}
    </Stack>
  );
}

/** Stitch's course table for one quarter; a row opens to its assignments */
export function QuarterTable({ data }: { data: Grades }) {
  const { t } = useTranslation('student');
  const [open, setOpen] = useState<string | null>(null);
  const head = { py: 1.25, px: 2, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textAlign: 'left' as const };
  const cell = { py: 1.5, px: 2, fontSize: '0.875rem' };

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', borderColor: STITCH.outline, boxShadow: STITCH.rowShadow, overflow: 'hidden', ...enter(1) }}>
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
          <Box component="thead" sx={{ bgcolor: '#EFF5F0' }}>
            <tr>
              <Box component="th" sx={{ ...head, width: 40, textAlign: 'center' }}>
                #
              </Box>
              <Box component="th" sx={head}>
                {t('grades.col.course')}
              </Box>
              <Box component="th" sx={head}>
                {t('grades.col.teacher')}
              </Box>
              <Box component="th" sx={{ ...head, textAlign: 'right' }}>
                {t('grades.col.grade')}
              </Box>
              <Box component="th" sx={{ ...head, textAlign: 'right' }}>
                {t('grades.col.attendance')}
              </Box>
              <Box component="th" sx={{ ...head, textAlign: 'center' }}>
                {t('grades.col.missing')}
              </Box>
              <Box component="th" sx={{ ...head, textAlign: 'right' }}>
                {t('grades.col.actions')}
              </Box>
            </tr>
          </Box>
          <tbody>
            {data.courses.map((c, i) => {
              const isOpen = open === c.courseId;
              return (
                <Fragment key={c.courseId}>
                  <Box
                    component="tr"
                    onClick={() => setOpen(isOpen ? null : c.courseId)}
                    sx={{ cursor: 'pointer', borderTop: 1, borderColor: STITCH.outlineSoft, bgcolor: isOpen ? 'rgba(239,245,240,0.5)' : 'transparent', transition: 'background-color 150ms ease', '&:hover': { bgcolor: '#F7FAF8' } }}
                  >
                    <Box component="td" sx={{ ...cell, textAlign: 'center', color: 'text.secondary', fontSize: '0.8125rem' }}>
                      {i + 1}
                    </Box>
                    <Box component="td" sx={{ ...cell, fontWeight: 600 }}>
                      {c.subjectName}
                    </Box>
                    <Box component="td" sx={{ ...cell, color: 'text.secondary' }}>
                      {c.teacherName ?? '—'}
                    </Box>
                    <Box component="td" sx={cell}>
                      <GradeCell percent={c.percent} mark={c.mark} isFinal={c.isFinal} />
                    </Box>
                    <Box component="td" sx={{ ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {pct(c.attendanceRate)}
                    </Box>
                    <Box component="td" sx={{ ...cell, textAlign: 'center' }}>
                      <SoftPill tone={c.missing ? 'peach' : 'neutral'}>{t('grades.missingPill', { count: c.missing })}</SoftPill>
                    </Box>
                    <Box component="td" sx={{ ...cell, textAlign: 'right' }}>
                      <Stack direction="row" sx={{ justifyContent: 'flex-end', alignItems: 'center', gap: 0.25, color: 'secondary.main', fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {isOpen ? t('grades.hide') : t('grades.view')}
                        <KeyboardArrowDownRoundedIcon sx={{ fontSize: 20, transition: 'transform 200ms ease', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                      </Stack>
                    </Box>
                  </Box>
                  <tr>
                    <Box component="td" colSpan={7} sx={{ p: 0 }}>
                      <Collapse in={isOpen} unmountOnExit>
                        <Box sx={{ px: 3, py: 2, bgcolor: 'rgba(239,245,240,0.35)', borderTop: 1, borderColor: STITCH.outlineSoft }}>
                          <ItemsTable course={c} periodName={data.period?.name ?? ''} />
                        </Box>
                      </Collapse>
                    </Box>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </Box>
      </Box>
    </Card>
  );
}

function ScoreCell({ item }: { item: Item }) {
  const { t } = useTranslation('student');
  if (item.score != null) return <>{`${item.score}/${item.maxScore}`}</>;
  if (item.state === 'SUBMITTED') return <Box component="span" sx={{ fontStyle: 'italic', color: 'text.secondary', fontWeight: 400 }}>{t('grades.items.notPublished')}</Box>;
  return <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>—</Box>;
}

/** The quarter's assignments of one course: score, state, the teacher's feedback (published only) */
function ItemsTable({ course, periodName }: { course: CourseRow; periodName: string }) {
  const { t } = useTranslation('student');
  const { locale } = useRouter();
  const head = { py: 1, px: 1.75, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textAlign: 'left' as const };
  const cell = { py: 1.25, px: 1.75, fontSize: '0.84375rem', verticalAlign: 'top' as const };

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, pb: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <AssignmentOutlinedIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{t('grades.items.title', { course: course.subjectName })}</Typography>
        </Stack>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('grades.items.count', { period: periodName, count: course.items.length })}</Typography>
      </Stack>
      {course.items.length === 0 ? (
        <Typography sx={{ fontSize: '0.84375rem', color: 'text.secondary' }}>{t('grades.items.none')}</Typography>
      ) : (
        <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: 1, borderColor: STITCH.outline, overflow: 'hidden' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead" sx={{ bgcolor: 'rgba(239,245,240,0.6)' }}>
              <tr>
                <Box component="th" sx={head}>
                  {t('grades.items.name')}
                </Box>
                <Box component="th" sx={head}>
                  {t('grades.items.date')}
                </Box>
                <Box component="th" sx={{ ...head, textAlign: 'right' }}>
                  {t('grades.items.score')}
                </Box>
                <Box component="th" sx={{ ...head, textAlign: 'center' }}>
                  {t('grades.items.status')}
                </Box>
                <Box component="th" sx={head}>
                  {t('grades.items.feedback')}
                </Box>
              </tr>
            </Box>
            <tbody>
              {course.items.map((item) => (
                <Box component="tr" key={item.assignmentId} sx={{ borderTop: 1, borderColor: STITCH.outlineSoft }}>
                  <Box component="td" sx={{ ...cell, fontWeight: 500 }}>
                    <Link component={NextLink} href={studentHref.assignment(course.courseId, item.assignmentId)} underline="hover" color="inherit">
                      {item.title}
                    </Link>
                  </Box>
                  <Box component="td" sx={{ ...cell, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {item.dueAt ? formatInSchool(item.dueAt, locale) : '—'}
                  </Box>
                  <Box component="td" sx={{ ...cell, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    <ScoreCell item={item} />
                  </Box>
                  <Box component="td" sx={{ ...cell, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <SoftPill tone={STATE_TONE[item.state]}>{t(`grades.state.${item.state}`)}</SoftPill>
                  </Box>
                  <Box component="td" sx={{ ...cell, color: 'text.secondary', fontSize: '0.8125rem' }}>
                    {item.feedback ?? '—'}
                  </Box>
                </Box>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/** Final tab: every course's quarters and the annual grade (one small query per course) */
export function FinalTable({ data }: { data: Grades }) {
  const { t } = useTranslation('student');
  const head = { py: 1.25, px: 2, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textAlign: 'right' as const, whiteSpace: 'nowrap' as const };
  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', borderColor: STITCH.outline, boxShadow: STITCH.rowShadow, overflow: 'hidden', ...enter(1) }}>
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
          <Box component="thead" sx={{ bgcolor: '#EFF5F0' }}>
            <tr>
              <Box component="th" sx={{ ...head, textAlign: 'left' }}>
                {t('grades.col.course')}
              </Box>
              {data.periods.map((p) => (
                <Box component="th" key={p.id} sx={head}>
                  {p.name}
                </Box>
              ))}
              <Box component="th" sx={head}>
                {t('grades.col.annual')}
              </Box>
            </tr>
          </Box>
          <tbody>
            {data.courses.map((c) => (
              <FinalRow key={c.courseId} course={c} periods={data.periods} />
            ))}
          </tbody>
        </Box>
      </Box>
    </Card>
  );
}

function FinalRow({ course, periods }: { course: CourseRow; periods: Grades['periods'] }) {
  const { data } = useQuery(MY_PERIOD_GRADES, { variables: { courseId: course.courseId }, fetchPolicy: 'cache-and-network' });
  const rows = data?.myPeriodGrades;
  const cell = { py: 1.5, px: 2 };
  const wait = <Skeleton width={56} sx={{ ml: 'auto' }} />;
  return (
    <Box component="tr" sx={{ borderTop: 1, borderColor: STITCH.outlineSoft }}>
      <Box component="td" sx={{ ...cell, fontWeight: 600, fontSize: '0.875rem' }}>
        {course.subjectName}
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{course.teacherName}</Typography>
      </Box>
      {periods.map((p) => {
        const r = rows?.periods.find((x) => x.periodId === p.id);
        return (
          <Box component="td" key={p.id} sx={cell}>
            {rows ? <GradeCell percent={r?.score ?? null} mark={r?.mark ?? null} isFinal={!!r?.isPublished} /> : wait}
          </Box>
        );
      })}
      <Box component="td" sx={{ ...cell, bgcolor: 'rgba(239,245,240,0.5)' }}>
        {rows ? <GradeCell percent={rows.annual.score} mark={rows.annual.mark} isFinal={rows.annual.isPublished} /> : wait}
      </Box>
    </Box>
  );
}

/** The phone list: a card per course, tap to see its assignments (kept simple, DECISIONS §10) */
export function QuarterList({ data }: { data: Grades }) {
  const { t } = useTranslation('student');
  const { locale } = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Stack spacing={1}>
      {data.courses.map((c, i) => {
        const isOpen = open === c.courseId;
        return (
          <Box key={c.courseId} sx={{ borderRadius: '12px', bgcolor: '#fff', boxShadow: STITCH.rowShadow, overflow: 'hidden', ...enter(i) }}>
            <ButtonBase onClick={() => setOpen(isOpen ? null : c.courseId)} aria-expanded={isOpen} sx={{ ...pressSx, width: '100%', p: 2, justifyContent: 'space-between', gap: 1.5, textAlign: 'left' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 600 }}>
                  {c.subjectName}
                </Typography>
                <Stack direction="row" sx={{ mt: 0.5, gap: 0.75, flexWrap: 'wrap' }}>
                  <SoftPill tone="neutral">{`${t('grades.col.attendance')} ${pct(c.attendanceRate)}`}</SoftPill>
                  {c.missing > 0 && <SoftPill tone="peach">{t('grades.missingPill', { count: c.missing })}</SoftPill>}
                </Stack>
              </Box>
              <GradeCell percent={c.percent} mark={c.mark} isFinal={c.isFinal} />
            </ButtonBase>
            <Collapse in={isOpen} unmountOnExit>
              <Stack sx={{ px: 2, pb: 1.5, '& > * + *': { borderTop: 1, borderColor: STITCH.outlineSoft } }}>
                {c.items.length === 0 && <Typography sx={{ py: 1, fontSize: '0.84375rem', color: 'text.secondary' }}>{t('grades.items.none')}</Typography>}
                {c.items.map((item) => (
                  <Link key={item.assignmentId} component={NextLink} href={studentHref.assignment(c.courseId, item.assignmentId)} underline="none" color="inherit" sx={{ py: 1.25 }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{item.dueAt ? formatInSchool(item.dueAt, locale) : '—'}</Typography>
                      </Box>
                      {item.score != null ? (
                        <Typography sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{`${item.score}/${item.maxScore}`}</Typography>
                      ) : (
                        <SoftPill tone={STATE_TONE[item.state]}>{t(`grades.state.${item.state}`)}</SoftPill>
                      )}
                    </Stack>
                    {item.feedback && <Typography sx={{ mt: 0.5, fontSize: '0.8125rem', color: 'text.secondary' }}>{item.feedback}</Typography>}
                  </Link>
                ))}
              </Stack>
            </Collapse>
          </Box>
        );
      })}
    </Stack>
  );
}

export function GradesHeader({ data, tabs }: { data: Grades; tabs: ReactNode }) {
  const { t } = useTranslation('student');
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-end' }, gap: 2, pb: 2, borderBottom: 1, borderColor: STITCH.outlineSoft }}>
      <Box>
        <Typography component="h1" sx={{ fontSize: { xs: '1.375rem', md: '1.5rem' }, fontWeight: 600, letterSpacing: '-0.015em' }}>
          {t('grades.title')}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: '0.84375rem', color: 'text.secondary' }}>
          {t('grades.summary', { rate: pct(data.attendanceRate), missing: t('grades.missing', { count: data.missing }) })}
        </Typography>
      </Box>
      {tabs}
    </Stack>
  );
}
