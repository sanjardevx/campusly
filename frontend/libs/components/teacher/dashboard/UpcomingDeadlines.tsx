import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { fadeUp } from '@/libs/components/dashboard/motion';
import type { TeacherDashboardQuery } from '@/libs/gql/graphql';
import { viz } from '@/libs/viz';
import { EmptyRow, ListCard } from './parts';

type Deadline = TeacherDashboardQuery['teacherDashboard']['deadlines'][number];

const pad = (n: number) => String(n).padStart(2, '0');

/** School dates use the calendar's validated colours (DECISIONS §13); assignments are deadlines */
const DOT: Record<Deadline['kind'], string> = {
  ASSIGNMENT: viz.calendar.DEADLINE,
  DEADLINE: viz.calendar.DEADLINE,
  START: viz.calendar.START,
  EVENT: viz.calendar.EVENT,
  TERM_START: viz.calendar.TERM_START,
  TERM_END: viz.calendar.TERM_END,
};

/** Stitch "Upcoming deadlines": the next two weeks, the teacher's assignments and school dates */
export function UpcomingDeadlines({ items, index }: { items: Deadline[]; index: number }) {
  const { t } = useTranslation('teacher');

  const title = (d: Deadline) =>
    d.kind === 'TERM_START' || d.kind === 'TERM_END'
      ? t(`dashboard.deadlines.kind.${d.kind}`, { name: d.title })
      : // "Homework 7 · Algebra · 9A, Algebra · 9B"
        [d.title, d.courseTitles.join(', ')].filter(Boolean).join(' · ');

  // The assignment's time on the viewer's clock; a school date says what it is
  const detail = (d: Deadline) => {
    if (d.dueAt) {
      const at = new Date(d.dueAt);
      return `${pad(at.getHours())}:${pad(at.getMinutes())}`;
    }
    return t(`dashboard.deadlines.kind.${d.kind === 'TERM_START' || d.kind === 'TERM_END' ? 'SCHOOL' : d.kind}`);
  };

  return (
    <ListCard title={t('dashboard.deadlines.title')} sx={fadeUp(index)}>
      {items.length === 0 ? (
        <EmptyRow>{t('dashboard.deadlines.empty')}</EmptyRow>
      ) : (
        <Stack spacing={1.5} sx={{ px: 2.5, py: 2 }}>
          {items.map((d) => {
            // "2026-10-24" → that day on the viewer's clock (not UTC midnight)
            const [y, m, day] = d.date.split('-').map(Number);
            const date = new Date(y, m - 1, day);
            return (
              <Stack key={d.id} direction="row" sx={{ gap: 1.5, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1, textTransform: 'uppercase' }}>
                    {t(`dashboard.weekdayShort.${date.getDay()}`)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{day}</Typography>
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }} noWrap title={title(d)}>
                    {title(d)}
                  </Typography>
                  <Stack direction="row" sx={{ mt: 0.25, alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: DOT[d.kind], flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                      {detail(d)}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            );
          })}
        </Stack>
      )}
    </ListCard>
  );
}
