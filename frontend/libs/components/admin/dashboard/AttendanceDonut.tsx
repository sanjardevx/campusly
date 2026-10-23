import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Box, Card, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { useTranslation } from 'next-i18next/pages';
import { ATTENDANCE_OVERVIEW } from '@/apollo/admin/query';
import type { AttendanceRange } from '@/libs/gql/graphql';
import { formatDate } from '@/libs/i18n/format';
import { viz } from '@/libs/viz';
import { EASE_OUT, fadeUp, useCountUp } from '@/libs/components/dashboard/motion';

const RANGES: AttendanceRange[] = ['TODAY', 'WEEK', 'MONTH'];
const STATUSES = ['present', 'late', 'excused', 'absent'] as const;

// Geometry: a 180 px ring, 18 px thick, starting at 12 o'clock
const SIZE = 180;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
/** dataviz: a 2 px surface gap between segments instead of borders */
const GAP = 2;

// Each segment grows from nothing to its length once (CSS only: no state, no timers)
const draw = keyframes`
  from { stroke-dasharray: 0 ${C}; }
`;

/**
 * Attendance overview (reference design): marks by status as a donut. dataviz allows a donut
 * for part-to-whole at a glance with ≤ 6 segments; the numbers stay readable in the legend.
 */
export function AttendanceDonut({ index }: { index: number }) {
  const { t } = useTranslation('admin');
  const { locale } = useRouter();
  const [range, setRange] = useState<AttendanceRange>('WEEK');
  const { data, previousData } = useQuery(ATTENDANCE_OVERVIEW, { variables: { range }, fetchPolicy: 'cache-and-network' });
  // dataviz: keep the old picture while the new range loads (no empty flash)
  const overview = (data ?? previousData)?.attendanceOverview;
  const total = overview?.total ?? 0;
  const attended = total ? ((total - (overview?.absent ?? 0)) / total) * 100 : 0;
  const shownRate = useCountUp(attended);

  // Segment lengths along the ring; each starts where the ones before it end
  const lengths = STATUSES.map((status) => (total ? ((overview?.[status] ?? 0) / total) * C : 0));
  const segments = STATUSES.map((status, i) => ({
    status,
    value: overview?.[status] ?? 0,
    start: lengths.slice(0, i).reduce((a, b) => a + b, 0),
    length: Math.max(0, lengths[i] - GAP),
  }));

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5, display: 'flex', flexDirection: 'column', ...fadeUp(index) }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 700 }}>
          {t('dashboard.donut.title')}
        </Typography>
        <TextField
          select
          size="small"
          value={range}
          onChange={(e) => setRange(e.target.value as AttendanceRange)}
          slotProps={{ htmlInput: { 'aria-label': t('dashboard.donut.range') } }}
          sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: '0.8125rem' } }}
        >
          {RANGES.map((r) => (
            <MenuItem key={r} value={r}>
              {t(`dashboard.donut.ranges.${r}`)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box sx={{ position: 'relative', width: SIZE, height: SIZE, mx: 'auto', my: 3 }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={t('dashboard.donut.aria', { rate: attended.toFixed(1), total })}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Track: shows when nothing is marked yet */}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#F1F2EE" strokeWidth={STROKE} />
          {segments.map(
            (s) =>
              s.length > 0 && (
                <Box
                  component="circle"
                  key={s.status}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke={viz[s.status]}
                  strokeWidth={STROKE}
                  strokeLinecap="butt"
                  sx={{
                    strokeDasharray: `${s.length} ${C}`,
                    strokeDashoffset: -s.start,
                    // A new range slides the segments to their new size
                    transition: `stroke-dasharray 400ms ${EASE_OUT}, stroke-dashoffset 400ms ${EASE_OUT}`,
                    animation: `${draw} 700ms ${EASE_OUT} both`,
                    animationDelay: `${index * 40 + 120}ms`,
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none', transition: 'none' },
                  }}
                />
              ),
          )}
        </svg>
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <Box>
            <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {total ? `${shownRate.toFixed(1)}%` : '—'}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {total ? t('dashboard.donut.marks', { count: total }) : t('dashboard.donut.empty')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Legend with numbers: identity is never colour alone */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        {segments.map((s) => (
          <Box
            key={s.status}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, border: 1, borderColor: 'divider', borderRadius: 2, px: 1.25, py: 0.75 }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: viz[s.status], flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', flex: 1, minWidth: 0 }} noWrap>
              {t(`dashboard.donut.status.${s.status}`)}
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>
              {total ? `${Math.round((s.value / total) * 100)}%` : '—'}
            </Typography>
          </Box>
        ))}
      </Box>
      {overview && (
        <Typography sx={{ mt: 1.5, fontSize: '0.75rem', color: 'text.secondary', textAlign: 'center' }}>
          {overview.from === overview.to
            ? formatDate(`${overview.from}T00:00`, locale)
            : `${formatDate(`${overview.from}T00:00`, locale)} – ${formatDate(`${overview.to}T00:00`, locale)}`}
        </Typography>
      )}
    </Card>
  );
}
