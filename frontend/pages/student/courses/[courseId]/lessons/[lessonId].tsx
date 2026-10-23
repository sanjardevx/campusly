import { useCallback } from 'react';
import type { GetStaticPaths } from 'next';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Box, Card, CircularProgress, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { STUDENT_LESSON } from '@/apollo/student/query';
import { layoutFor } from '@/libs/components/layout';
import { LessonView } from '@/libs/components/student/lesson/LessonView';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });
export const getStaticProps = withTranslations(['student']);

/** One lesson for its student: video with the watch rule, text, file, link (DECISIONS §10, §11) */
const LessonPage: NextPageWithLayout = () => {
  const { t } = useTranslation('student');
  const { query } = useRouter();
  const courseId = typeof query.courseId === 'string' ? query.courseId : '';
  const lessonId = typeof query.lessonId === 'string' ? query.lessonId : '';
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const { data, error, refetch } = useQuery(STUDENT_LESSON, { variables: { courseId }, skip: !courseId, fetchPolicy: 'cache-and-network' });
  // Progress changed (completed): this page, the course page and the home page show it
  const refresh = useCallback(() => void refetch(), [refetch]);
  useCrumb(data?.courseDetail.title ?? null);

  if (error && !data) {
    return (
      <Card variant="outlined" sx={{ borderRadius: '12px', p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('lesson.notFound')}</Typography>
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
  return <LessonView data={data} lessonId={lessonId} desktop={desktop} refetch={refresh} />;
};

LessonPage.getLayout = layoutFor('STUDENT');
export default LessonPage;
