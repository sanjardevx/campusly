import { useQuery } from '@apollo/client/react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { TEACHING_COURSES } from '@/apollo/teacher/query';
import { layoutFor } from '@/libs/components/layout';
import { MyCourses } from '@/libs/components/teacher/dashboard/MyCourses';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['teacher']);

/** "My Courses": no Stitch screen of its own, so the dashboard's course cards (every course, any year) */
const CoursesPage: NextPageWithLayout = () => {
  const { t } = useTranslation('teacher');
  const { data } = useQuery(TEACHING_COURSES, { fetchPolicy: 'cache-and-network' });

  if (!data) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const courses = data.teachingCourses.map((c) => ({ id: c.id, title: c.title, status: c.status, students: c.studentCount, week: null }));
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
          {t('courses.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.25 }}>
          {t('courses.subtitle')}
        </Typography>
      </Box>
      <MyCourses courses={courses} index={0} hideTitle />
    </Stack>
  );
};

CoursesPage.getLayout = layoutFor('TEACHER');
export default CoursesPage;
