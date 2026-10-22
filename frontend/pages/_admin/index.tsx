import { useQuery, useReactiveVar } from '@apollo/client/react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { ADMIN_DASHBOARD } from '@/apollo/admin/query';
import { userVar } from '@/apollo/store';
import { AttendanceDonut } from '@/libs/components/admin/dashboard/AttendanceDonut';
import { CalendarCard } from '@/libs/components/admin/dashboard/CalendarCard';
import { KpiRow } from '@/libs/components/admin/dashboard/KpiRow';
import { NeedsAttentionCard } from '@/libs/components/admin/dashboard/NeedsAttentionCard';
import { QuickActions } from '@/libs/components/admin/dashboard/QuickActions';
import { RecentActivity } from '@/libs/components/admin/dashboard/RecentActivity';
import { layoutFor } from '@/libs/components/layout';
import { formatDate } from '@/libs/i18n/format';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['admin']);

/** Morning until 12, afternoon until 18, then evening (the admin's own clock) */
const partOfDay = (hour: number) => (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');

/**
 * Admin home: Stitch "Campusly Admin — Dashboard" + ideas from the reference design (coloured KPI
 * tiles, attendance donut, month calendar, students needing attention). The numbers come from the
 * server, counted in the school timezone. The website blocks return with the CMS (later phase).
 */
const DashboardPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const { locale } = useRouter();
  const user = useReactiveVar(userVar);
  const { data } = useQuery(ADMIN_DASHBOARD, { fetchPolicy: 'cache-and-network' });
  const dashboard = data?.adminDashboard;

  if (!dashboard) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  // "2026-10-23" → a local date, so the day never shifts in a timezone behind UTC
  const [y, m, d] = dashboard.today.split('-').map(Number);
  const today = new Date(y, m - 1, d);
  const period = dashboard.period;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
          {t(`dashboard.greeting.${partOfDay(new Date().getHours())}`, { name: user?.firstName ?? '' })}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.25 }}>
          {t(`dashboard.weekday.${today.getDay()}`)}, {formatDate(today, locale)}
          {period && ` · ${t('dashboard.periodWeek', { period: period.name, week: period.week })}`}
        </Typography>
      </Box>

      <KpiRow data={dashboard} />

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', lg: 'minmax(0, 4fr) minmax(0, 5fr) minmax(0, 4fr)' },
          gridTemplateAreas: {
            xs: '"donut" "attention" "calendar" "activity" "quick"',
            md: '"donut calendar" "attention attention" "activity quick"',
            lg: '"donut attention calendar" "activity activity quick"',
          },
          // Every card is as tall as its own content
          alignItems: 'start',
        }}
      >
        <Box sx={{ gridArea: 'donut' }}>
          <AttendanceDonut index={4} />
        </Box>
        <Box sx={{ gridArea: 'attention' }}>
          <NeedsAttentionCard data={dashboard.needsAttention} index={5} />
        </Box>
        <Box sx={{ gridArea: 'calendar' }}>
          <CalendarCard today={dashboard.today} index={6} />
        </Box>
        <Box sx={{ gridArea: 'activity' }}>
          <RecentActivity items={dashboard.recentActivity} index={7} />
        </Box>
        <Box sx={{ gridArea: 'quick' }}>
          <QuickActions period={period} index={8} />
        </Box>
      </Box>
    </Stack>
  );
};

DashboardPage.getLayout = layoutFor('ADMIN');
export default DashboardPage;
