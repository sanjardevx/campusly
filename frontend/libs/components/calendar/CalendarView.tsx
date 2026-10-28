import { useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useQuery } from '@apollo/client/react';
import { Box, Button, ButtonBase, Card, CircularProgress, IconButton, MenuItem, Select, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { useTranslation } from 'next-i18next/pages';
import { STUDENT_CALENDAR } from '@/apollo/student/query';
import { daysOf, isoDay, shiftMonth } from '@/libs/components/dashboard/calendar';
import { schoolTime, schoolToday, studentHref } from '@/libs/components/student/home/due';
import { STITCH, SoftPill, enter, pressSx } from '@/libs/components/student/home/parts';
import type { StudentCalendarQuery } from '@/libs/gql/graphql';
import { viz } from '@/libs/viz';
import { MonthGrid } from './MonthGrid';

type Event = StudentCalendarQuery['studentCalendar'][number];
type Filter = 'ALL' | 'HOMEWORK' | 'QUIZ' | 'EXAM' | 'SCHOOL';
const FILTERS: Filter[] = ['ALL', 'HOMEWORK', 'QUIZ', 'EXAM', 'SCHOOL'];
const LEGEND = ['HOLIDAY', 'EVENT', 'DEADLINE', 'START'] as const;

const fadeIn = keyframes`
  from { opacity: 0; }
`;

/** "2026-10-16" → its parts and weekday (1 = Monday … 7 = Sunday), read as a plain calendar day */
function partsOf(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return { y, m, d, weekday: ((new Date(y, m - 1, d).getDay() + 6) % 7) + 1 };
}

/** "2026-10-16" moved by n days */
function addDays(day: string, n: number) {
  const { y, m, d } = partsOf(day);
  const at = new Date(y, m - 1, d + n);
  return isoDay(at.getFullYear(), at.getMonth() + 1, at.getDate());
}

/** The filter chips: school dates or one kind of work; a chosen course narrows the work only */
function matches(e: Event, filter: Filter, course: string) {
  if (e.kind !== 'ASSIGNMENT') return filter === 'ALL' || filter === 'SCHOOL';
  if (course && e.courseId !== course) return false;
  return filter === 'ALL' || e.assignmentType === filter;
}

/**
 * Each event on one day of the agenda: work on its due day, a school date on its first day in
 * the shown range (a 9-day holiday is one card, not nine).
 */
function agendaDays(events: Event[], from: string, to: string) {
  const byDay = new Map<string, Event[]>();
  for (const e of events) {
    const day = e.startsOn < from ? from : e.startsOn;
    if (day > to || e.endsOn < from) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
}

type Tone = 'mint' | 'peach' | 'neutral';

/** The pill on a work card. Before grades are published the server never says GRADED / MISSING. */
function useStatus() {
  const { t } = useTranslation('calendar');
  return (e: Event): { tone: Tone; label: string } | null => {
    if (e.kind !== 'ASSIGNMENT') return null;
    const past = !!e.dueAt && new Date(e.dueAt) < new Date();
    if (e.assignmentType === 'EXAM') return { tone: 'neutral', label: t(past ? 'status.DONE' : 'status.UPCOMING') };
    switch (e.submissionStatus) {
      case 'SUBMITTED':
      case 'LATE':
      case 'GRADED':
        return { tone: 'mint', label: t(`status.${e.submissionStatus}`) };
      case 'RETURNED':
      case 'MISSING':
        return { tone: 'peach', label: t(`status.${e.submissionStatus}`) };
      default:
        return past ? { tone: 'peach', label: t('status.OVERDUE') } : { tone: 'neutral', label: t(e.assignmentType === 'QUIZ' ? 'status.NOT_STARTED' : 'status.NOT_SUBMITTED') };
    }
  };
}

/**
 * Stitch "Student Calendar (Agenda View)" and "Mobile Calendar (Deadlines)": the school's dates and
 * the student's own work with its status (studentCalendar). Parents see their chosen child's
 * calendar read-only (`studentId`, checked by the server; `linkWork` false).
 */
export function CalendarView({ studentId, linkWork }: { studentId?: string; linkWork: boolean }) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [today] = useState(schoolToday);
  const [selected, setSelected] = useState(today);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [course, setCourse] = useState('');

  // The selected day's month; on a phone the week strip may also reach into the next month
  const month = selected.slice(0, 7);
  const weekStart = addDays(selected, 1 - partsOf(selected).weekday);
  const weekEnd = addDays(weekStart, 6);
  const otherMonth = [weekStart, weekEnd].map((d) => d.slice(0, 7)).find((m) => m !== month);
  const main = useQuery(STUDENT_CALENDAR, { variables: { month, studentId }, fetchPolicy: 'cache-and-network' });
  const extra = useQuery(STUDENT_CALENDAR, { variables: { month: otherMonth ?? month, studentId }, skip: desktop || !otherMonth });
  const loaded = (main.data ?? main.previousData)?.studentCalendar;
  const events = [...(loaded ?? []), ...(!desktop && otherMonth ? (extra.data?.studentCalendar ?? []) : [])].filter(
    (e, i, all) => all.findIndex((x) => x.id === e.id && x.kind === e.kind) === i,
  );

  if (!loaded) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  // Courses of this month's work, for the course filter
  const courses = [...new Map(events.filter((e) => e.courseId && e.note).map((e) => [e.courseId!, e.note!])).entries()];
  const shown = events.filter((e) => matches(e, filter, course));
  const props = { events: shown, all: events, today, selected, setSelected, filter, setFilter, course, setCourse, courses, linkWork };
  return desktop ? <DesktopCalendar {...props} month={month} /> : <PhoneCalendar {...props} weekStart={weekStart} />;
}

type ViewProps = {
  events: Event[];
  /** Before the filters (the overview counts) */
  all: Event[];
  today: string;
  selected: string;
  setSelected: (day: string) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  course: string;
  setCourse: (id: string) => void;
  courses: [string, string][];
  linkWork: boolean;
};

function DesktopCalendar({ events, all: monthEvents, today, selected, setSelected, filter, setFilter, course, setCourse, courses, linkWork, month }: ViewProps & { month: string }) {
  const { t } = useTranslation('calendar');
  const { y, m } = partsOf(`${month}-01`);
  const last = isoDay(y, m, new Date(y, m, 0).getDate());
  const all = agendaDays(events, `${month}-01`, last);
  // This month starts at today like Stitch; the days before it wait behind "Show earlier days"
  const [showPast, setShowPast] = useState(false);
  const thisMonth = month === today.slice(0, 7);
  const earlier = thisMonth && !showPast ? all.filter(([d]) => d < today).length : 0;
  const days = earlier ? all.filter(([d]) => d >= today) : all;

  const goMonth = (step: number) => {
    const next = shiftMonth(month, step);
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
  };
  const pick = (day: string) => {
    setSelected(day);
    if (thisMonth && day < today) setShowPast(true);
    // The agenda shows the month as a list: bring the picked day (or the next one with something) into view
    const target = all.find(([d]) => d >= day)?.[0];
    if (target) requestAnimationFrame(() => document.getElementById(`day-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const dots = new Map<string, string[]>();
  for (const e of events) for (const d of daysOf(e, y, m)) dots.set(d, [...(dots.get(d) ?? []), viz.calendar[e.kind]]);

  // "October at a glance": the month's work for this student, whatever the filters
  const now = new Date();
  const work = monthEvents.filter((e) => e.kind === 'ASSIGNMENT');
  const handedIn = (e: Event) => ['SUBMITTED', 'LATE', 'GRADED'].includes(e.submissionStatus ?? '');
  const glance = [
    { key: 'pending', tone: 'peach' as const, count: work.filter((e) => e.assignmentType !== 'EXAM' && !handedIn(e) && !!e.dueAt && new Date(e.dueAt) >= now).length },
    { key: 'upcoming', tone: 'neutral' as const, count: work.filter((e) => e.assignmentType !== 'HOMEWORK' && !!e.dueAt && new Date(e.dueAt) >= now).length },
    { key: 'done', tone: 'mint' as const, count: work.filter(handedIn).length },
  ];

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography component="h1" sx={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: STITCH.ink }}>
          {t('title')}
        </Typography>
        <Stack direction="row" sx={{ alignItems: 'center', border: 1, borderColor: STITCH.outline, borderRadius: 2, bgcolor: '#fff' }}>
          <IconButton size="small" onClick={() => goMonth(-1)} aria-label={t('previousMonth')} sx={pressSx}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ minWidth: 150, textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t(`month.${m}`)} {y}
          </Typography>
          <IconButton size="small" onClick={() => goMonth(1)} aria-label={t('nextMonth')} sx={pressSx}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Button variant="outlined" color="inherit" size="small" onClick={() => pick(today)} sx={{ ...pressSx, borderColor: STITCH.outline, bgcolor: '#fff' }}>
          {t('today')}
        </Button>
        {courses.length > 0 && (
          <Stack direction="row" sx={{ ml: 'auto', alignItems: 'center', gap: 1 }}>
            <Typography component="label" htmlFor="calendar-course" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
              {t('course')}:
            </Typography>
            <Select id="calendar-course" size="small" value={course} displayEmpty onChange={(e) => setCourse(e.target.value)} sx={{ minWidth: 180, fontSize: '0.875rem', bgcolor: '#fff' }}>
              <MenuItem value="">{t('allCourses')}</MenuItem>
              {courses.map(([id, title]) => (
                <MenuItem key={id} value={id}>
                  {title}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        )}
      </Stack>

      <Chips filter={filter} setFilter={setFilter} />

      <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: 'minmax(0, 8fr) minmax(0, 4fr)' }}>
        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
          {earlier > 0 && (
            <Button color="inherit" onClick={() => setShowPast(true)} sx={{ alignSelf: 'flex-start', color: 'text.secondary', fontWeight: 600 }}>
              {t('showEarlier', { count: earlier })}
            </Button>
          )}
          {days.length === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: '12px', borderColor: STITCH.outline, p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('empty')}</Typography>
            </Card>
          ) : (
            days.map(([day, list], i) => (
              <Box key={day} id={`day-${day}`} component="section" sx={{ scrollMarginTop: 96, opacity: day < today ? 0.7 : 1, ...enter(i) }}>
                <DayHeading day={day} today={today} selected={day === selected} />
                <Stack spacing={1}>
                  {list.map((e) => (
                    <AgendaCard key={`${day}-${e.kind}-${e.id}`} event={e} linkWork={linkWork} />
                  ))}
                </Stack>
              </Box>
            ))
          )}
        </Stack>

        <Stack spacing={2.5} sx={{ position: 'sticky', top: 88, minWidth: 0 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px', borderColor: STITCH.outline, boxShadow: STITCH.rowShadow, p: 2.5 }}>
            <Typography component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>
              {t(`month.${m}`)} {y}
            </Typography>
            <MonthGrid
              year={y}
              month={m}
              dotsOf={(d) => dots.get(d) ?? []}
              selected={selected}
              today={today}
              onSelect={pick}
              dayName={(d) => t(`day.${d}`)}
              dayLabel={(d, has) => `${d} ${t(`month.${m}`)}${has ? `, ${t('hasEvents')}` : ''}`}
            />
            <Legend />
          </Card>
          <Card variant="outlined" sx={{ borderRadius: '12px', borderColor: STITCH.outline, boxShadow: STITCH.rowShadow, p: 2.5 }}>
            <Typography component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>
              {t('glance.title', { month: t(`month.${m}`) })}
            </Typography>
            <Stack spacing={1.25}>
              {glance.map((g) => (
                <Stack key={g.key} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.84375rem', color: 'text.secondary' }}>{t(`glance.${g.key}`)}</Typography>
                  <SoftPill tone={g.tone}>{t('items', { count: g.count })}</SoftPill>
                </Stack>
              ))}
            </Stack>
          </Card>
        </Stack>
      </Box>
    </Stack>
  );
}

function PhoneCalendar({ events, today, selected, setSelected, filter, setFilter, linkWork, weekStart }: ViewProps & { weekStart: string }) {
  const { t } = useTranslation('calendar');
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const { y, m } = partsOf(selected);
  // From the chosen day to the end of its month (and the rest of the week when it runs over)
  const monthEnd = isoDay(y, m, new Date(y, m, 0).getDate());
  const days = agendaDays(events, selected, week[6] > monthEnd ? week[6] : monthEnd);
  const dotsOf = (day: string) => [...new Set(events.filter((e) => day >= e.startsOn && day <= e.endsOn).map((e) => viz.calendar[e.kind]))].slice(0, 3);

  return (
    <Stack spacing={2}>
      <Box sx={{ px: 2, pb: 1.5, bgcolor: '#fff', borderRadius: '16px', boxShadow: STITCH.rowShadow }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
          <Typography component="h1" sx={{ fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.02em', color: STITCH.ink }}>
            {t('title')}
          </Typography>
          <Button variant="outlined" color="inherit" size="small" onClick={() => setSelected(today)} sx={{ ...pressSx, borderRadius: 999, borderColor: STITCH.outline }}>
            {t('today')}
          </Button>
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          <Typography sx={{ fontWeight: 600 }}>
            {t(`month.${m}`)} {y}
          </Typography>
          <Stack direction="row">
            <IconButton size="small" onClick={() => setSelected(addDays(selected, -7))} aria-label={t('previousWeek')}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setSelected(addDays(selected, 7))} aria-label={t('nextWeek')}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
        <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {week.map((day) => {
            const p = partsOf(day);
            const isSelected = day === selected;
            const dots = dotsOf(day);
            return (
              <ButtonBase
                key={day}
                onClick={() => setSelected(day)}
                aria-pressed={isSelected}
                aria-label={t('dayLabel', { weekday: t(`weekday.${p.weekday}`), day: p.d, month: t(`monthShort.${p.m}`) })}
                sx={{ flexDirection: 'column', gap: 0.5, py: 0.75, borderRadius: 2, bgcolor: isSelected ? STITCH.surfaceContainer : 'transparent', transition: 'background-color 150ms' }}
              >
                <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', fontWeight: day === today ? 700 : 500 }}>{t(`day.${p.weekday}`)}</Typography>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '0.9375rem',
                    fontWeight: isSelected || day === today ? 700 : 500,
                    fontVariantNumeric: 'tabular-nums',
                    color: isSelected ? '#fff' : 'text.primary',
                    bgcolor: isSelected ? STITCH.ink : 'transparent',
                    outline: day === today && !isSelected ? '1.5px solid' : 'none',
                    outlineColor: STITCH.ink,
                  }}
                >
                  {p.d}
                </Box>
                <Box sx={{ display: 'flex', gap: '3px', height: 5 }}>
                  {dots.map((c) => (
                    <Box key={c} sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: c }} />
                  ))}
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
      </Box>

      <Chips filter={filter} setFilter={setFilter} />

      {days.length === 0 ? (
        <Typography sx={{ px: 0.5, py: 2, fontSize: '0.875rem', color: 'text.secondary' }}>{t('emptyFrom')}</Typography>
      ) : (
        days.map(([day, list], i) => (
          <Box key={day} component="section" sx={enter(i)}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', px: 0.5, mb: 1 }}>
              <Typography component="h2" sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                <PhoneDayTitle day={day} today={today} />
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('items', { count: list.length })}</Typography>
            </Stack>
            <Stack spacing={1}>
              {list.map((e) => (
                <AgendaCard key={`${day}-${e.kind}-${e.id}`} event={e} linkWork={linkWork} />
              ))}
            </Stack>
          </Box>
        ))
      )}
      <Legend />
    </Stack>
  );
}

/** All / Homework / Quizzes / Exams / School dates (one line; scrolls sideways on a phone) */
function Chips({ filter, setFilter }: { filter: Filter; setFilter: (f: Filter) => void }) {
  const { t } = useTranslation('calendar');
  return (
    <Stack role="group" aria-label={t('filter')} direction="row" sx={{ gap: 1, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, pb: 0.25 }}>
      {FILTERS.map((f) => {
        const active = f === filter;
        return (
          <ButtonBase
            key={f}
            aria-pressed={active}
            onClick={() => setFilter(f)}
            sx={{
              ...pressSx,
              flexShrink: 0,
              px: 1.75,
              py: 0.75,
              borderRadius: 999,
              border: 1,
              borderColor: active ? STITCH.ink : STITCH.outline,
              bgcolor: active ? STITCH.ink : '#fff',
              color: active ? '#fff' : 'text.primary',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            {t(`filters.${f}`)}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

/** The dot colours are never the only clue: the legend and each card's tag say the same */
function Legend() {
  const { t } = useTranslation('calendar');
  return (
    <Stack direction="row" sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: STITCH.outlineSoft, flexWrap: 'wrap', columnGap: 2, rowGap: 0.75 }}>
      {LEGEND.map((kind) => (
        <Stack key={kind} direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: viz.calendar[kind] }} />
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t(`legend.${kind}`)}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

/** Stitch's day heading: a square with the date number, "THU 16 OCT", "(Today)" */
function DayHeading({ day, today, selected }: { day: string; today: string; selected: boolean }) {
  const { t } = useTranslation('calendar');
  const p = partsOf(day);
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mb: 1 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          fontSize: '0.8125rem',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          border: 1,
          borderColor: selected ? STITCH.ink : STITCH.outline,
          bgcolor: day === today ? STITCH.ink : selected ? STITCH.surfaceContainer : '#fff',
          color: day === today ? '#fff' : 'text.primary',
        }}
      >
        {p.d}
      </Box>
      <Typography component="h2" sx={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {t('dayLabel', { weekday: t(`weekday.${p.weekday}`), day: p.d, month: t(`monthShort.${p.m}`) })}
        {day === today && (
          <Box component="span" sx={{ ml: 1, color: 'text.secondary', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
            ({t('today')})
          </Box>
        )}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: STITCH.outline }} />
    </Stack>
  );
}

/** "Today · Thu, Oct 16" · "Tomorrow · Fri, Oct 17" · "Mon, Oct 20" */
function PhoneDayTitle({ day, today }: { day: string; today: string }) {
  const { t } = useTranslation('calendar');
  const p = partsOf(day);
  const label = t('dayLabel', { weekday: t(`weekday.${p.weekday}`), day: p.d, month: t(`monthShort.${p.m}`) });
  if (day === today) return <>{`${t('today')} · ${label}`}</>;
  if (day === addDays(today, 1)) return <>{`${t('tomorrow')} · ${label}`}</>;
  return <>{label}</>;
}

/** One agenda row: what it is, the course and time, the student's status; work opens its page */
function AgendaCard({ event: e, linkWork }: { event: Event; linkWork: boolean }) {
  const { t } = useTranslation('calendar');
  const status = useStatus()(e);
  const work = e.kind === 'ASSIGNMENT';
  const term = e.kind === 'TERM_START' || e.kind === 'TERM_END';
  const tag = work ? t(`type.${e.assignmentType ?? 'HOMEWORK'}`) : t(`kind.${e.kind}`);
  const title = term ? t(`term.${e.kind}`, { name: e.title }) : e.title;
  const range = (from: string, to: string) => {
    const a = partsOf(from);
    const b = partsOf(to);
    return `${a.d} ${t(`monthShort.${a.m}`)} – ${b.d} ${t(`monthShort.${b.m}`)}`;
  };
  const meta = work
    ? [e.note, e.dueAt && (e.assignmentType === 'EXAM' ? t('inClass') : t('due', { time: schoolTime(e.dueAt) }))]
    : [e.startsOn !== e.endsOn && range(e.startsOn, e.endsOn), e.note ?? t('wholeSchool')];

  const body: ReactNode = (
    <>
      <Box
        component="span"
        sx={{ flexShrink: 0, px: 1, py: 0.25, borderRadius: 1, border: 1, borderColor: viz.calendar[e.kind], color: 'text.primary', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}
      >
        {tag}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, overflowWrap: 'anywhere' }}>{title}</Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{meta.filter(Boolean).join(' · ')}</Typography>
      </Box>
      {status && <SoftPill tone={status.tone}>{status.label}</SoftPill>}
      {work && linkWork && <ChevronRightRoundedIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />}
    </>
  );
  const sx = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    p: { xs: 1.5, md: 2 },
    textAlign: 'left',
    bgcolor: '#fff',
    border: 1,
    borderColor: STITCH.outline,
    borderLeft: `3px solid ${viz.calendar[e.kind]}`,
    borderRadius: '12px',
    boxShadow: STITCH.rowShadow,
    flexWrap: { xs: 'wrap', sm: 'nowrap' },
    animation: `${fadeIn} 150ms ease`,
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  } as const;

  return work && linkWork && e.courseId && e.assignmentId ? (
    <ButtonBase component={NextLink} href={studentHref.assignment(e.courseId, e.assignmentId)} sx={{ ...sx, ...pressSx, '&:hover': { bgcolor: '#FBFDFB' } }}>
      {body}
    </ButtonBase>
  ) : (
    <Box sx={sx}>{body}</Box>
  );
}
