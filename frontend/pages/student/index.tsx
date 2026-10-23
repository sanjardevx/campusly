import { useQuery } from '@apollo/client/react';
import { Box, CircularProgress, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { STUDENT_OVERVIEW } from '@/apollo/student/query';
import { layoutFor } from '@/libs/components/layout';
import { CourseCards } from '@/libs/components/student/home/CourseCards';
import { MobileHome } from '@/libs/components/student/home/MobileHome';
import { STITCH } from '@/libs/components/student/home/parts';
import { StudentCalendar, ToDoCard } from '@/libs/components/student/home/SideCards';
import { ThisWeek } from '@/libs/components/student/home/ThisWeek';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['student']);

/** Morning until 12, afternoon until 18, then evening (the student's own clock) */
const partOfDay = (hour: number) => (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');

/**
 * Student home: Stitch "Student Dashboard (Compact eCampus)" in the main column (8/12) and a side
 * column like the admin dashboard: To Do and the month calendar. A phone gets the simple
 * MobileHome list instead (DECISIONS §10).
 */
const Home: NextPageWithLayout = () => {
  const { t } = useTranslation('student');
  const { data } = useQuery(STUDENT_OVERVIEW, { fetchPolicy: 'cache-and-network' });
  const overview = data?.studentOverview;
  // Same breakpoint as the phone shell (spruce header + tab bar)
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  if (!overview) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!desktop) return <MobileHome overview={overview} />;

  const { period } = overview;
  const due = overview.upcoming.filter((u) => !u.isDone).length;

  return (
    <Box>
      <Box component="header" sx={{ pb: 4, borderBottom: 1, borderColor: STITCH.surfaceContainer }}>
        {period && (
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, fontSize: '0.75rem', lineHeight: '1rem' }}>
            <Box component="span" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'secondary.main' }}>
              {period.name}
            </Box>
            <Box component="span" aria-hidden sx={{ color: '#C0C8C4' }}>
              •
            </Box>
            <Box component="span" sx={{ fontWeight: 500, color: 'text.secondary' }}>
              {t('home.week', { week: period.week })}
            </Box>
          </Stack>
        )}
        <Typography component="h1" sx={{ mt: 0.5, fontSize: { xs: '1.625rem', md: '2rem' }, lineHeight: { xs: '2.125rem', md: '2.5rem' }, fontWeight: 600, letterSpacing: '-0.02em', color: STITCH.ink }}>
          {t(`home.greeting.${partOfDay(new Date().getHours())}`, { name: overview.student.firstName })}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: '0.9375rem', lineHeight: '1.5rem', color: 'text.secondary' }}>
          {due > 0 ? t('home.dueThisWeek', { count: due }) : t('home.nothingDue')}
        </Typography>
      </Box>

      {/* Stitch's 12-column grid: main 8, side 4 (stacked below lg) */}
      <Box sx={{ pt: 4, display: 'grid', gap: 4, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 8fr) minmax(0, 4fr)' } }}>
        <Stack spacing={5} sx={{ minWidth: 0 }}>
          <ThisWeek lessons={overview.continueLessons} upcoming={overview.upcoming} index={0} />
          <CourseCards courses={overview.courses} periodName={period?.name ?? null} index={7} />
        </Stack>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <ToDoCard items={overview.overdue} index={2} />
          <StudentCalendar index={3} />
        </Stack>
      </Box>
    </Box>
  );
};

Home.getLayout = layoutFor('STUDENT');
export default Home;
