import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box, Button, ButtonBase, Card, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useTranslation } from 'next-i18next/pages';
import { ARCHIVE_SCHOOL_EVENT } from '@/apollo/admin/mutation';
import { DASHBOARD_CALENDAR } from '@/apollo/admin/query';
import { ConfirmDialog } from '@/libs/components/admin/ConfirmDialog';
import type { DashboardCalendarQuery, SchoolEventKind } from '@/libs/gql/graphql';
import { viz } from '@/libs/viz';
import { EventDrawer } from './EventDrawer';
import { fadeUp } from '@/libs/components/dashboard/motion';

export type CalendarEvent = DashboardCalendarQuery['dashboardCalendar'][number];

const LEGEND: SchoolEventKind[] = ['HOLIDAY', 'EVENT', 'DEADLINE', 'START'];
const UPCOMING = 4;

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Monday-first weeks of a month; null = a cell outside the month */
function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const days = new Date(year, month, 0).getDate();
  const lead = (first + 6) % 7;
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** Every day an event covers inside this month ("YYYY-MM-DD" compares as text) */
function daysOf(event: CalendarEvent, year: number, month: number): string[] {
  const last = new Date(year, month, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    const day = isoDay(year, month, d);
    if (day >= event.startsOn && day <= event.endsOn) out.push(day);
  }
  return out;
}

/**
 * The school calendar for admins: holidays, school events, programme deadlines and starts
 * (SchoolEvent, added here) plus term starts / ends. Coloured dots mark the days; the chosen day's
 * events are listed below with edit and archive. Course deadlines stay in the courses.
 */
export function CalendarCard({ today, index }: { today: string; index: number }) {
  const { t } = useTranslation('admin');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState<CalendarEvent | 'new' | null>(null);
  const [archiving, setArchiving] = useState<CalendarEvent | null>(null);
  const [y, m] = month.split('-').map(Number);

  const { data, previousData } = useQuery(DASHBOARD_CALENDAR, { variables: { month }, fetchPolicy: 'cache-and-network' });
  const [archive, archiveState] = useMutation(ARCHIVE_SCHOOL_EVENT, { refetchQueries: ['DashboardCalendar', 'AdminDashboard'] });
  const events = (data ?? previousData)?.dashboardCalendar ?? [];

  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) for (const day of daysOf(e, y, m)) byDay.set(day, [...(byDay.get(day) ?? []), e]);

  const move = (step: number) => {
    const d = new Date(y, m - 1 + step, 1);
    const next = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    setMonth(next);
    // Today when going back to this month, else the 1st
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
  };

  const ofDay = byDay.get(selected) ?? [];
  const upcoming = ofDay.length ? [] : events.filter((e) => e.startsOn > selected).slice(0, UPCOMING);
  const monthName = (n: number) => t(`dashboard.month.${n}`);

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5, display: 'flex', flexDirection: 'column', minWidth: 0, ...fadeUp(index) }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 700 }}>
          {t('dashboard.calendar.title')}
        </Typography>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setEditing('new')}>
          {t('dashboard.calendar.add')}
        </Button>
      </Stack>

      {/* Month switcher */}
      <Stack direction="row" sx={{ mt: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton size="small" onClick={() => move(-1)} aria-label={t('dashboard.calendar.previous')}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
          {monthName(m)} {y}
        </Typography>
        <IconButton size="small" onClick={() => move(1)} aria-label={t('dashboard.calendar.next')}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Weekday names, then the days */}
      <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 0.5, textAlign: 'center' }}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <Typography key={d} sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', py: 0.5 }}>
            {t(`dashboard.day.${d}`)}
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
              aria-label={`${day} ${monthName(m)}${dots.length ? `, ${t('dashboard.calendar.hasEvents')}` : ''}`}
              sx={{
                mx: 'auto',
                width: 36,
                height: 40,
                borderRadius: '10px',
                flexDirection: 'column',
                gap: '3px',
                fontSize: '0.8125rem',
                fontWeight: isToday || isSelected ? 700 : 500,
                color: isSelected ? '#fff' : isToday ? 'primary.main' : 'text.primary',
                bgcolor: isSelected ? 'primary.main' : 'transparent',
                outline: isToday && !isSelected ? '1.5px solid' : 'none',
                outlineColor: 'primary.main',
                transition: 'background-color 150ms, color 150ms',
                '&:hover': { bgcolor: isSelected ? 'primary.dark' : 'primary.light' },
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

      {/* Legend: the dot colours are never the only clue (dataviz) */}
      <Stack direction="row" sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
        {LEGEND.map((kind) => (
          <Box key={kind} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: viz.calendar[kind] }} />
            <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{t(`dashboard.calendar.kind.${kind}`)}</Typography>
          </Box>
        ))}
      </Stack>

      {/* The chosen day, or what comes next */}
      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 1 }}>
          {ofDay.length
            ? t('dashboard.calendar.onDay', { day: Number(selected.slice(8)), month: monthName(Number(selected.slice(5, 7))) })
            : upcoming.length
              ? t('dashboard.calendar.nothingThenNext')
              : t('dashboard.calendar.nothing')}
        </Typography>
        <Stack spacing={1}>
          {(ofDay.length ? ofDay : upcoming).map((e, i) => (
            <EventRow key={`${selected}-${e.id}`} event={e} order={i} onEdit={() => setEditing(e)} onArchive={() => setArchiving(e)} />
          ))}
        </Stack>
      </Box>

      {editing && (
        <EventDrawer
          event={editing === 'new' ? null : editing}
          defaultDay={selected}
          onClose={() => setEditing(null)}
          onSaved={(day) => {
            setEditing(null);
            setMonth(day.slice(0, 7));
            setSelected(day);
          }}
        />
      )}
      <ConfirmDialog
        open={!!archiving}
        title={t('dashboard.calendar.archiveTitle')}
        body={t('dashboard.calendar.archiveBody', { title: archiving?.title ?? '' })}
        confirmLabel={t('dashboard.calendar.archive')}
        danger
        busy={archiveState.loading}
        onClose={() => setArchiving(null)}
        onConfirm={() => {
          if (!archiving?.schoolEventId) return;
          void archive({ variables: { id: archiving.schoolEventId } }).then(() => setArchiving(null));
        }}
      />
    </Card>
  );
}

function EventRow({
  event,
  order,
  onEdit,
  onArchive,
}: {
  event: CalendarEvent;
  order: number;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const { t } = useTranslation('admin');
  const term = !event.schoolEventId;
  // "30 Dec – 8 Jan" or "24 Oct"; a short month name (Korean ones are short already)
  const short = (iso: string) => `${Number(iso.slice(8))} ${t(`dashboard.month.${Number(iso.slice(5, 7))}`).slice(0, 3)}`;
  const when = event.startsOn === event.endsOn ? short(event.startsOn) : `${short(event.startsOn)} – ${short(event.endsOn)}`;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.25,
        border: 1,
        borderColor: 'divider',
        borderLeft: `3px solid ${viz.calendar[event.kind]}`,
        borderRadius: 2,
        transition: 'background-color 150ms',
        '&:hover': { bgcolor: 'background.default' },
        // Re-runs on every new day: the list slides in instead of snapping
        ...fadeUp(order),
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Up to two lines: event titles are longer than the card is wide */}
        <Typography
          sx={{ fontSize: '0.8125rem', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {term ? t(`dashboard.calendar.kind.${event.kind}`, { name: event.title }) : event.title}
        </Typography>
        <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }} noWrap>
          {term ? t('dashboard.calendar.term') : [t(`dashboard.calendar.kind.${event.kind}`), event.note].filter(Boolean).join(' · ')}
        </Typography>
      </Box>
      <Typography sx={{ flexShrink: 0, fontSize: '0.6875rem', fontWeight: 600, border: 1, borderColor: 'divider', borderRadius: 10, px: 1, py: 0.25 }}>
        {when}
      </Typography>
      {/* Term dates come from Settings → Academic year; only the school's own events are edited here */}
      {!term && (
        <Stack direction="row">
          <Tooltip title={t('dashboard.calendar.edit')}>
            <IconButton size="small" onClick={onEdit} aria-label={t('dashboard.calendar.edit')}>
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('dashboard.calendar.archive')}>
            <IconButton size="small" onClick={onArchive} aria-label={t('dashboard.calendar.archive')}>
              <ArchiveOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
    </Box>
  );
}
