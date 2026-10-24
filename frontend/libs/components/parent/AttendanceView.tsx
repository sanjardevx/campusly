import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, Card, MenuItem, Select, Stack, Switch, FormControlLabel, Typography } from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'next-i18next/pages';
import { fadeUp, useCountUp } from '@/libs/components/dashboard/motion';
import { SegmentedTabs, pressSx } from '@/libs/components/student/home/parts';
import type { AttendanceStatus, ParentAttendanceQuery } from '@/libs/gql/graphql';
import { viz } from '@/libs/viz';

type Data = ParentAttendanceQuery['studentAttendance'];
type Lesson = Data['lessons'][number];
type Summary = Data['summary'];

const STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'EXCUSED', 'ABSENT'];
/** Dot = the validated data colour (DECISIONS §13); pill = a soft tint with darker text, always labelled */
const DOT: Record<AttendanceStatus, string> = { PRESENT: viz.present, LATE: viz.late, EXCUSED: viz.excused, ABSENT: viz.absent };
const PILL: Record<AttendanceStatus, { bgcolor: string; color: string }> = {
  PRESENT: { bgcolor: '#E5F6EE', color: '#0E7A55' },
  LATE: { bgcolor: '#FDF3DD', color: '#8A5A00' },
  EXCUSED: { bgcolor: '#EAF2FC', color: '#1C5CAB' },
  ABSENT: { bgcolor: '#FDECEC', color: '#B42318' },
};
const DAYS_PER_PAGE = { desktop: 10, phone: 3 };

const pct = (n: number | null | undefined) => (n == null ? '—' : `${Number.isInteger(n) ? n : n.toFixed(1)}%`);
/** "Thu, Oct 16" from a school date "YYYY-MM-DD" (no timezone shift) */
const dayLabel = (day: string, locale = 'en') => new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
/** Present, late and excused all count as attended (an excused absence does not lower the rate) */
const attended = (s: Summary) => s.present + s.late + s.excused;

function groupByDay(lessons: Lesson[]) {
  const days: { date: string; lessons: Lesson[] }[] = [];
  for (const lesson of lessons) {
    const last = days[days.length - 1];
    if (last?.date === lesson.date) last.lessons.push(lesson);
    else days.push({ date: lesson.date, lessons: [lesson] });
  }
  return days;
}

/**
 * Parent Attendance (Stitch "Parent Mobile: Attendance", widened for desktop — DECISIONS §10): one
 * quarter of the chosen child — the rate and counts, each course, every marked lesson by day.
 * Phones get the Stitch list only (summary + latest days); desktop adds the course table and filters.
 */
export function AttendanceView({ data, tabs, phone }: { data: Data; tabs: ReactNode; phone: boolean }) {
  const { t } = useTranslation('parent');
  const { locale } = useRouter();
  const [courseId, setCourseId] = useState('');
  const [onlyMissed, setOnlyMissed] = useState(false);
  const [days, setDays] = useState(phone ? DAYS_PER_PAGE.phone : DAYS_PER_PAGE.desktop);

  const lessons = data.lessons.filter((l) => (!courseId || l.courseId === courseId) && (!onlyMissed || l.status !== 'PRESENT'));
  const grouped = groupByDay(lessons);
  const shown = grouped.slice(0, days);
  const step = phone ? DAYS_PER_PAGE.phone : DAYS_PER_PAGE.desktop;

  const list = (
    <Box>
      {shown.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: '12px', p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">{data.lessons.length ? t('attendance.noMatch') : t('attendance.none')}</Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {shown.map((day) => (
            <Box key={day.date}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.75, color: 'text.secondary' }}>
                <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>{dayLabel(day.date, locale)}</Typography>
              </Stack>
              <Card variant="outlined" sx={{ borderRadius: '12px' }}>
                <Stack sx={{ '& > * + *': { borderTop: 1, borderColor: '#ECEEE8' } }}>
                  {day.lessons.map((l) => (
                    <Stack key={`${l.courseId}-${l.date}`} direction="row" sx={{ px: 2, py: 1.5, gap: 2, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 500 }}>{l.courseTitle}</Typography>
                        {l.teacherName && <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{l.teacherName}</Typography>}
                        {l.note && (
                          <Stack direction="row" sx={{ mt: 0.5, gap: 0.5, alignItems: 'flex-start', color: 'text.secondary' }}>
                            <InfoOutlinedIcon sx={{ fontSize: 15, mt: '2px' }} />
                            <Typography sx={{ fontSize: '0.8125rem', fontStyle: 'italic' }}>“{l.note}”</Typography>
                          </Stack>
                        )}
                      </Box>
                      <StatusPill status={l.status} />
                    </Stack>
                  ))}
                </Stack>
              </Card>
            </Box>
          ))}
        </Stack>
      )}
      {grouped.length > days && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button color="inherit" size="small" onClick={() => setDays((n) => n + step)} sx={{ ...pressSx, color: 'text.secondary', fontWeight: 600 }}>
            {phone ? t('attendance.seeAll') : t('attendance.moreDays', { shown: shown.length, total: grouped.length })}
          </Button>
        </Box>
      )}
    </Box>
  );

  if (phone) {
    return (
      <Stack spacing={2.5}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
          {t('attendance.title')}
        </Typography>
        {tabs}
        <SummaryCard summary={data.summary} label={t('attendance.periodRate', { period: data.period?.name ?? '' })} />
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>{t('attendance.recent')}</Typography>
        {list}
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 1040, width: '100%', mx: 'auto' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            {t('attendance.title')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
            {t('attendance.subtitle')}
          </Typography>
        </Box>
        {tabs}
      </Stack>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'minmax(260px, 4fr) 8fr', alignItems: 'start' }}>
        <SummaryCard summary={data.summary} label={t('attendance.periodRate', { period: data.period?.name ?? '' })} />
        <Card variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', ...fadeUp(1) }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { px: 2, py: 1.25, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }, '& td:first-of-type, & th:first-of-type': { textAlign: 'left' }, '& tbody tr + tr td': { borderTop: 1, borderColor: '#ECEEE8' } }}>
            <Box component="thead" sx={{ bgcolor: '#F1F2EE', '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' } }}>
              <tr>
                <th>{t('attendance.course')}</th>
                <th>{t('attendance.rate')}</th>
                {STATUSES.map((s) => (
                  <th key={s}>{t(`attendance.status.${s}`)}</th>
                ))}
              </tr>
            </Box>
            <tbody>
              {data.courses.map((c) => (
                <tr key={c.courseId}>
                  <td>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{c.subjectName}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{c.teacherName ?? '—'}</Typography>
                  </td>
                  <Box component="td" sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                    {pct(c.summary.rate)}
                  </Box>
                  {STATUSES.map((s) => {
                    const n = c.summary[s.toLowerCase() as 'present' | 'late' | 'excused' | 'absent'];
                    return (
                      <Box component="td" key={s} sx={{ fontSize: '0.875rem', color: n ? 'text.primary' : 'text.disabled', fontWeight: s === 'ABSENT' && n ? 700 : 400 }}>
                        {n}
                      </Box>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Box>
        </Card>
      </Box>

      <Box sx={fadeUp(2)}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
          <Typography component="h2" sx={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
            {t('attendance.lessons')}
          </Typography>
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
            <FormControlLabel
              control={<Switch size="small" checked={onlyMissed} onChange={(e) => (setOnlyMissed(e.target.checked), setDays(step))} />}
              label={t('attendance.onlyMissed')}
              slotProps={{ typography: { sx: { fontSize: '0.8125rem' } } }}
            />
            <Select size="small" value={courseId} displayEmpty onChange={(e) => (setCourseId(e.target.value), setDays(step))} sx={{ minWidth: 180, fontSize: '0.875rem', bgcolor: '#fff' }} inputProps={{ 'aria-label': t('attendance.course') }}>
              <MenuItem value="">{t('attendance.allCourses')}</MenuItem>
              {data.courses.map((c) => (
                <MenuItem key={c.courseId} value={c.courseId}>
                  {c.title}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        </Stack>
        {list}
      </Box>
    </Stack>
  );
}

/** Stitch summary card: the rate, "N of M lessons attended", four labelled counts */
function SummaryCard({ summary, label }: { summary: Summary; label: string }) {
  const { t, i18n } = useTranslation('parent');
  const counted = useCountUp(summary.rate ?? 0);
  const decimals = summary.rate != null && !Number.isInteger(summary.rate) ? 1 : 0;
  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5, ...fadeUp(0) }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>{label}</Typography>
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1.25, mt: 0.5, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: '2.75rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, color: summary.rate == null ? 'text.disabled' : 'text.primary' }}>
          {summary.rate == null ? '—' : `${counted.toLocaleString(i18n.language, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`}
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
          {summary.total ? t('attendance.attended', { attended: attended(summary), total: summary.total }) : t('attendance.noMarks')}
        </Typography>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', mt: 2, pt: 2, borderTop: 1, borderColor: '#ECEEE8', textAlign: 'center' }}>
        {STATUSES.map((s) => (
          <Box key={s}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: DOT[s] }} />
              <Typography sx={{ fontSize: '1.0625rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{summary[s.toLowerCase() as 'present' | 'late' | 'excused' | 'absent']}</Typography>
            </Stack>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{t(`attendance.status.${s}`)}</Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
}

function StatusPill({ status }: { status: AttendanceStatus }) {
  const { t } = useTranslation('parent');
  return (
    <Box component="span" sx={{ ...PILL[status], flexShrink: 0, px: 1.25, py: 0.25, borderRadius: 999, fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {t(`attendance.status.${status}`)}
    </Box>
  );
}

/** The quarter tabs above the page (Stitch: Q1 … Q4) */
export function QuarterTabs({ periods, value, onChange }: { periods: Data['periods']; value: string; onChange: (id: string) => void }) {
  return <SegmentedTabs tabs={periods.map((p) => ({ id: p.id, label: p.name }))} value={value} onChange={onChange} />;
}
