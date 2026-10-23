import type { GetStaticPaths } from 'next';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Box, Card, CircularProgress, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { STUDENT_COURSE } from '@/apollo/student/query';
import { layoutFor } from '@/libs/components/layout';
import { CourseView } from '@/libs/components/student/course/CourseView';
import { MobileCourse } from '@/libs/components/student/course/MobileCourse';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });
export const getStaticProps = withTranslations(['student']);

/**
 * A course for its student (DECISIONS §10): the weeks the teacher opened, each lesson and
 * assignment with the student's own state (courseProgress). A phone gets the simple list.
 */
const CoursePage: NextPageWithLayout = () => {
  const { t } = useTranslation('student');
  const { query } = useRouter();
  const courseId = typeof query.courseId === 'string' ? query.courseId : '';
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const { data, error } = useQuery(STUDENT_COURSE, { variables: { courseId }, skip: !courseId, fetchPolicy: 'cache-and-network' });
  useCrumb(data?.courseDetail.title ?? null);

  if (error && !data) {
    // Not enrolled, a draft or a wrong link all answer NOT_FOUND: one calm message
    return (
      <Card variant="outlined" sx={{ borderRadius: '12px', p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('course.notFound')}</Typography>
      </Card>
    );
  }
  if (!data) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  return desktop ? <CourseView data={data} /> : <MobileCourse data={data} />;
};

CoursePage.getLayout = layoutFor('STUDENT');
export default CoursePage;
