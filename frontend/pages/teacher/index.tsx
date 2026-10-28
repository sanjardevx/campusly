import { useQuery, useReactiveVar } from '@apollo/client/react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { TEACHER_DASHBOARD } from '@/apollo/teacher/query';
import { userVar } from '@/apollo/store';
import { layoutFor } from '@/libs/components/layout';
import { AttendanceToday } from '@/libs/components/teacher/dashboard/AttendanceToday';
import { MyCourses } from '@/libs/components/teacher/dashboard/MyCourses';
import { NeedsGrading } from '@/libs/components/teacher/dashboard/NeedsGrading';
import { RecentAnnouncements } from '@/libs/components/teacher/dashboard/RecentAnnouncements';
import { UnansweredQuestions } from '@/libs/components/teacher/dashboard/UnansweredQuestions';
import { UpcomingDeadlines } from '@/libs/components/teacher/dashboard/UpcomingDeadlines';
import { formatDate } from '@/libs/i18n/format';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['teacher', 'qa']);

/** Morning until 12, afternoon until 18, then evening (the teacher's own clock) */
const partOfDay = (hour: number) => (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');

/**
 * Teacher home: Stitch "Campusly — Teacher Dashboard". One query; the server limits everything
 * to the teacher's own courses. Without a timetable, "Today's classes" becomes "Attendance today"
 * (DECISIONS §10). The Q&A card loads its own list (courseQuestions).
 */
const DashboardPage: NextPageWithLayout = () => {
  const { t } = useTranslation('teacher');
  const { locale } = useRouter();
  const user = useReactiveVar(userVar);
  const { data } = useQuery(TEACHER_DASHBOARD, { fetchPolicy: 'cache-and-network' });
  const dashboard = data?.teacherDashboard;

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

      {/* Stitch: a main column (~2/3) and a side column (~1/3); one column below lg */}
      <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(0, 1fr)' } }}>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <AttendanceToday courses={dashboard.todayCourses} holiday={dashboard.holiday} index={0} />
          <NeedsGrading items={dashboard.grading} total={dashboard.toGradeTotal} index={1} />
          <MyCourses courses={dashboard.courses} index={2} />
        </Stack>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <UnansweredQuestions index={3} />
          <UpcomingDeadlines items={dashboard.deadlines} index={4} />
          <RecentAnnouncements items={dashboard.announcements} index={5} />
        </Stack>
      </Box>
    </Stack>
  );
};

DashboardPage.getLayout = layoutFor('TEACHER');
export default DashboardPage;
