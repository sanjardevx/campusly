import { useQuery } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { STUDENT_OVERVIEW } from '@/apollo/student/query';
import { layoutFor } from '@/libs/components/layout';
import { TutorView } from '@/libs/components/student/tutor/TutorView';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['student']);

/** AI Study Tutor (UI ahead of the tutor phase): the course picker lists the student's own courses */
const TutorPage: NextPageWithLayout = () => {
  const { t } = useTranslation('student');
  const { data } = useQuery(STUDENT_OVERVIEW);
  const courses = (data?.studentOverview.courses ?? []).map((c) => ({ id: c.courseId, title: c.title }));
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
          {t('tutor.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
          {t('tutor.subtitle')}
        </Typography>
      </Box>
      <TutorView courses={courses} />
    </Stack>
  );
};

TutorPage.getLayout = layoutFor('STUDENT');
export default TutorPage;
