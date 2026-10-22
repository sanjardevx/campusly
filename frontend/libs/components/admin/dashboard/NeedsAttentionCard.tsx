import { Avatar, Box, Card, Stack, Typography } from '@mui/material';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import { useTranslation } from 'next-i18next/pages';
import type { AdminDashboardQuery, AttentionPriority } from '@/libs/gql/graphql';
import { viz } from '@/libs/viz';
import { fadeUp } from './motion';

type Attention = AdminDashboardQuery['adminDashboard']['needsAttention'];

/** Priority = status colour + the word (never colour alone) */
const PRIORITY: Record<AttentionPriority, { color: string; bg: string }> = {
  HIGH: { color: '#B42318', bg: '#FDECEC' },
  MEDIUM: { color: '#8A5A00', bg: '#FDF3DD' },
  LOW: { color: viz.tile.blue.fg, bg: viz.tile.blue.bg },
};

/**
 * Students needing attention (reference design) — attendance only. The rules live on the server
 * (DashboardService: below 75 / 85 / 90 % this period → high / medium / low).
 */
export function NeedsAttentionCard({ data, index }: { data: Attention; index: number }) {
  const { t } = useTranslation('admin');
  const counts: [AttentionPriority, number][] = [
    ['HIGH', data.high],
    ['MEDIUM', data.medium],
    ['LOW', data.low],
  ];

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5, display: 'flex', flexDirection: 'column', height: '100%', ...fadeUp(index) }}>
      <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 700 }}>
        {t('dashboard.attention.title')}
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('dashboard.attention.rule')}</Typography>

      {/* Summary: total + per priority */}
      <Stack direction="row" sx={{ mt: 2, pb: 2, borderBottom: 1, borderColor: 'divider', alignItems: 'flex-end', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.1 }}>{data.total}</Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{t('dashboard.attention.total')}</Typography>
        </Box>
        {counts.map(([priority, n]) => (
          <Box key={priority} sx={{ textAlign: 'center', minWidth: 56 }}>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: PRIORITY[priority].color }}>{n}</Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{t(`dashboard.attention.priority.${priority}`)}</Typography>
          </Box>
        ))}
      </Stack>

      {data.students.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          {t('dashboard.attention.none')}
        </Typography>
      ) : (
        // The list scrolls inside the card: the header and the summary stay, the card never grows
        <Stack
          spacing={1}
          sx={{ mt: 1.5, mx: -1, px: 1, pb: 0.5, flex: 1, minHeight: 0, maxHeight: { xs: 360, md: 'none' }, overflowY: 'auto' }}
        >
          {data.students.map((s, i) => {
            return (
              <Box
                key={s.studentId}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.25,
                  border: 1,
                  borderColor: 'divider',
                  // The priority: this colour on the left + the word on the icon's label
                  borderLeft: `3px solid ${PRIORITY[s.priority].color}`,
                  borderRadius: 2,
                  transition: 'background-color 150ms, border-color 150ms',
                  '&:hover': { bgcolor: 'background.default', borderColor: 'primary.light' },
                  ...fadeUp(index + 1 + i),
                }}
              >
                <Avatar sx={{ width: 34, height: 34, fontSize: '0.8125rem', fontWeight: 600, bgcolor: viz.tile.spruce.bg, color: viz.tile.spruce.fg }}>
                  {s.firstName[0]}
                  {s.lastName[0]}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }} noWrap>
                    {s.lastName} {s.firstName}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {[s.className, s.loginId].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, textAlign: 'right' }}>
                  <Box
                    title={t(`dashboard.attention.priority.${s.priority}`)}
                    sx={{ width: 28, height: 28, borderRadius: 1.5, display: 'grid', placeItems: 'center', flexShrink: 0, bgcolor: PRIORITY[s.priority].bg, color: PRIORITY[s.priority].color }}
                  >
                    <EventBusyOutlinedIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>{s.attendanceRate}%</Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                      {t('dashboard.attention.marks', { count: s.marks })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}
