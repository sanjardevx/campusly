import { useQuery } from '@apollo/client/react';
import { Box, CircularProgress } from '@mui/material';
import { STUDENT_OVERVIEW } from '@/apollo/student/query';
import { layoutFor } from '@/libs/components/layout';
import { CourseCards } from '@/libs/components/student/home/CourseCards';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['student']);

/** "My Courses": the home page's course cards on their own (same query, already cached from Home) */
const CoursesPage: NextPageWithLayout = () => {
  const { data } = useQuery(STUDENT_OVERVIEW, { fetchPolicy: 'cache-and-network' });
  const overview = data?.studentOverview;

  if (!overview) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  return <CourseCards courses={overview.courses} periodName={overview.period?.name ?? null} index={0} onListPage />;
};

CoursesPage.getLayout = layoutFor('STUDENT');
export default CoursesPage;
