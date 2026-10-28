import type { GetStaticPaths } from 'next';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Box, Card, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { COURSE_QUESTION } from '@/apollo/qa/query';
import { layoutFor } from '@/libs/components/layout';
import { ThreadView } from '@/libs/components/qa/ThreadView';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });
export const getStaticProps = withTranslations(['student', 'qa']);

/** One question of the course with its replies; the student can reply (DECISIONS §14) */
const QuestionPage: NextPageWithLayout = () => {
  const { t } = useTranslation('qa');
  const { query } = useRouter();
  const courseId = typeof query.courseId === 'string' ? query.courseId : '';
  const id = typeof query.questionId === 'string' ? query.questionId : '';
  const { data, error } = useQuery(COURSE_QUESTION, { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' });
  useCrumb(data ? t('title') : null);

  if (error && !data) {
    // Another course, a classmate's private question or a hidden one: all NOT_FOUND
    return (
      <Card variant="outlined" sx={{ borderRadius: '12px', p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('thread.notFound')}</Typography>
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
  return <ThreadView thread={data.courseQuestion} backHref={`/student/courses/${courseId}/questions`} />;
};

QuestionPage.getLayout = layoutFor('STUDENT');
export default QuestionPage;
