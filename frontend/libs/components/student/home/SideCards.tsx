import { useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Box, Button, ButtonBase, Card, IconButton, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from 'next-i18next/pages';
import { STUDENT_CALENDAR } from '@/apollo/student/query';
import { daysOf, isoDay, monthGrid, shiftMonth } from '@/libs/components/dashboard/calendar';
import { EASE_OUT } from '@/libs/components/dashboard/motion';
import { SCHOOL_TIMEZONE } from '@/libs/config';
import type { StudentCalendarQuery, StudentOverviewQuery } from '@/libs/gql/graphql';
import { viz } from '@/libs/viz';
import { formatDueAt, studentHref } from './due';
import { STITCH, SoftPill, enter, pressSx } from './parts';

type CalendarEvent = StudentCalendarQuery['studentCalendar'][number];

/** The side column's card: Stitch row surface (white, soft outline, 12 px corners) */
function SideCard({ title, badge, action, children, index }: { title: string; badge?: ReactNode; action?: ReactNode; children: ReactNode; index: number }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', borderColor: STITCH.outline, boxShadow: STITCH.rowShadow, p: 2.5, minWidth: 0, ...enter(index) }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <Typography component="h2" sx={{ fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '-0.005em' }}>
            {title}
          </Typography>
          {badge}
        </Stack>
        {action}
      </Stack>
      {children}
    </Card>
  );
}

/** Past the deadline but still accepted (late work allowed, grades not published) */
export function ToDoCard({ items, index }: { items: StudentOverviewQuery['studentOverview']['overdue']; index: number }) {
  const { t } = useTranslation('student');
  const { locale } = useRouter();

  return (
    <SideCard title={t('home.todo.title')} badge={items.length > 0 && <SoftPill tone="peach">{items.length}</SoftPill>} index={index}>
      {items.length === 0 ? (
        <Typography sx={{ fontSize: '0.84375rem', color: 'text.secondary', py: 1 }}>{t('home.todo.empty')}</Typography>
      ) : (
        <Stack spacing={1}>
          {items.map((a, i) => (
            <Stack
              key={a.assignmentId}
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, p: 1.25, borderRadius: 2, bgcolor: STITCH.surfaceContainer, ...enter(index + 1 + i) }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: '0.875rem', fontWeight: 600 }} title={a.title}>
                  {a.title}
                </Typography>
                <Typography noWrap sx={{ fontSize: '0.75rem', color: '#763300', fontVariantNumeric: 'tabular-nums' }}>
                  {a.courseTitle} · {t('home.todo.wasDue', { date: formatDueAt(a.dueAt, locale) })}
                </Typography>
              </Box>
              <Button
                component={NextLink}
                href={studentHref.assignment(a.courseId, a.assignmentId)}
                size="small"
                variant="contained"
                sx={{ ...pressSx, flexShrink: 0, bgcolor: STITCH.ink, boxShadow: 'none', borderRadius: 2, fontSize: '0.75rem', fontWeight: 600, '&:hover': { bgcolor: 'primary.main', boxShadow: 'none' } }}
              >
                {t('home.todo.submit')}
              </Button>
            </Stack>
          ))}
        </Stack>
      )}
    </SideCard>
  );
}

const LEGEND = ['HOLIDAY', 'EVENT', 'DEADLINE', 'START'] as const;
const UPCOMING = 4;

// Month change and day list: opacity only. They are clicked often, so no movement, and the month
// fade starts at 0.4 (a fast double click restarts it without a flash to blank)
const crossfade = keyframes`
  from { opacity: 0.4; }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
`;

/** Today in the school's timezone ("2026-10-23"): business dates follow the school (DECISIONS §12) */
const schoolToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/**
 * Read-only month calendar (DECISIONS §10): the school's dates (holidays, events, deadlines, starts,
 * term dates) plus the student's own due work, which opens the assignment page.
 */
export function StudentCalendar({ index }: { index: number }) {
  const { t } = useTranslation('student');
  const [today] = useState(schoolToday);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [y, m] = month.split('-').map(Number);

  const { data, previousData } = useQuery(STUDENT_CALENDAR, { variables: { month }, fetchPolicy: 'cache-and-network' });
  const events = (data ?? previousData)?.studentCalendar ?? [];

  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) for (const day of daysOf(e, y, m)) byDay.set(day, [...(byDay.get(day) ?? []), e]);

  const move = (step: number) => {
    const next = shiftMonth(month, step);
    setMonth(next);
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
  };

  const ofDay = byDay.get(selected) ?? [];
  const upcoming = ofDay.length ? [] : events.filter((e) => e.startsOn > selected).slice(0, UPCOMING);
  const monthName = (n: number) => t(`home.calendar.month.${n}`);

  return (
    <SideCard
      title={t('home.calendar.title')}
      index={index}
      action={
        <Stack direction="row" sx={{ alignItems: 'center' }}>
          <IconButton size="small" onClick={() => move(-1)} aria-label={t('home.calendar.previous')} sx={pressSx}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 112, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
            {monthName(m)} {y}
          </Typography>
          <IconButton size="small" onClick={() => move(1)} aria-label={t('home.calendar.next')} sx={pressSx}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Stack>
      }
    >
      {/* key = month: the grid crossfades instead of snapping when the month changes */}
      <Box
        key={month}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          rowGap: 0.5,
          textAlign: 'center',
          animation: `${crossfade} 150ms ${EASE_OUT}`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <Typography key={d} sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', py: 0.5 }}>
            {t(`home.calendar.day.${d}`)}
          </Typography>
        ))}
        {monthGrid(y, m).map((day, i) => {
          if (!day) return <Box key={`blank-${i}`} />;
          const iso = isoDay(y, m, day);
          const dots = [...new Set((byDay.get(iso) ?? []).map((e) => viz.calendar[e.kind]))].slice(0, 3);
          const isSelected = iso === selected;
          const isToday = iso === today;
          return (
            <ButtonBase
              key={iso}
              onClick={() => setSelected(iso)}
              aria-pressed={isSelected}
              aria-label={`${day} ${monthName(m)}${dots.length ? `, ${t('home.calendar.hasEvents')}` : ''}`}
              sx={{
                mx: 'auto',
                width: 36,
                height: 40,
                borderRadius: '10px',
                flexDirection: 'column',
                gap: '3px',
                fontSize: '0.8125rem',
                fontWeight: isToday || isSelected ? 700 : 500,
                fontVariantNumeric: 'tabular-nums',
                color: isSelected ? '#fff' : isToday ? STITCH.ink : 'text.primary',
                bgcolor: isSelected ? STITCH.ink : 'transparent',
                outline: isToday && !isSelected ? '1.5px solid' : 'none',
                outlineColor: STITCH.ink,
                transition: `background-color 150ms, color 150ms, transform 150ms ${EASE_OUT}`,
                '&:hover': { bgcolor: isSelected ? STITCH.ink : STITCH.surfaceContainer },
                '&:active': { transform: 'scale(0.95)' },
                '@media (prefers-reduced-motion: reduce)': { '&:active': { transform: 'none' } },
              }}
            >
              {day}
              <Box sx={{ display: 'flex', gap: '2px', height: 4 }}>
                {dots.map((color) => (
                  <Box key={color} sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: isSelected ? '#fff' : color }} />
                ))}
              </Box>
            </ButtonBase>
          );
        })}
      </Box>

      {/* Legend: the dot colours are never the only clue; due work is a deadline */}
      <Stack direction="row" sx={{ mt: 1.5, flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.5, justifyContent: 'center' }}>
        {LEGEND.map((kind) => (
          <Box key={kind} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: viz.calendar[kind] }} />
            <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{t(`home.calendar.kind.${kind}`)}</Typography>
          </Box>
        ))}
      </Stack>

      {/* The chosen day, or what comes next */}
      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: STITCH.outlineSoft }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 1 }}>
          {ofDay.length
            ? t('home.calendar.onDay', { day: Number(selected.slice(8)), month: monthName(Number(selected.slice(5, 7))) })
            : upcoming.length
              ? t('home.calendar.nothingThenNext')
              : t('home.calendar.nothing')}
        </Typography>
        <Stack spacing={1}>
          {(ofDay.length ? ofDay : upcoming).map((e) => (
            <EventRow key={`${selected}-${e.id}`} event={e} />
          ))}
        </Stack>
      </Box>
    </SideCard>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const { t } = useTranslation('student');
  const term = event.kind === 'TERM_START' || event.kind === 'TERM_END';
  const short = (iso: string) => `${Number(iso.slice(8))} ${t(`home.calendar.month.${Number(iso.slice(5, 7))}`).slice(0, 3)}`;
  const when = event.startsOn === event.endsOn ? short(event.startsOn) : `${short(event.startsOn)} – ${short(event.endsOn)}`;
  const title = term ? t(`home.calendar.kind.${event.kind}`, { name: event.title }) : event.title;
  const detail = term ? t('home.calendar.term') : [t(`home.calendar.kind.${event.kind}`), event.note].filter(Boolean).join(' · ');

  const body = (
    <>
      <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {title}
        </Typography>
        <Typography noWrap sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
          {detail}
        </Typography>
      </Box>
      <Typography sx={{ flexShrink: 0, fontSize: '0.6875rem', fontWeight: 600, bgcolor: STITCH.surfaceContainer, borderRadius: 1, px: 1, py: 0.25, fontVariantNumeric: 'tabular-nums' }}>
        {when}
      </Typography>
    </>
  );

  const sx = {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    width: '100%',
    p: 1.25,
    border: 1,
    borderColor: STITCH.outline,
    borderLeft: `3px solid ${viz.calendar[event.kind]}`,
    borderRadius: 2,
    transition: 'background-color 150ms',
    '&:hover': { bgcolor: STITCH.surfaceContainer },
    animation: `${fadeIn} 150ms ease`,
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  };

  // Due work opens its assignment page; school dates are just information
  return event.assignmentId && event.courseId ? (
    <ButtonBase component={NextLink} href={studentHref.assignment(event.courseId, event.assignmentId)} sx={sx}>
      {body}
    </ButtonBase>
  ) : (
    <Box sx={sx}>{body}</Box>
  );
}
