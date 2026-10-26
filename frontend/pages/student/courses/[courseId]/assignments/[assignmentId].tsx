import type { GetStaticPaths } from 'next';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Box, Card, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { STUDENT_ASSIGNMENT } from '@/apollo/student/query';
import { layoutFor } from '@/libs/components/layout';
import { HomeworkView } from '@/libs/components/student/homework/HomeworkView';
import { QuizView } from '@/libs/components/student/quiz/QuizView';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });
export const getStaticProps = withTranslations(['student']);

/** One assignment for its student: hand in, see the status, the published grade (DECISIONS §10) */
const AssignmentPage: NextPageWithLayout = () => {
  const { t } = useTranslation('student');
  const { query } = useRouter();
  const courseId = typeof query.courseId === 'string' ? query.courseId : '';
  const assignmentId = typeof query.assignmentId === 'string' ? query.assignmentId : '';
  // network-only: signed file links in the answer expire, and the status must be fresh
  const { data, error, refetch } = useQuery(STUDENT_ASSIGNMENT, { variables: { courseId, assignmentId }, skip: !courseId || !assignmentId, fetchPolicy: 'network-only' });
  useCrumb(data?.courseDetail.title ?? null);

  if (error && !data) {
    return (
      <Card variant="outlined" sx={{ borderRadius: '12px', p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('homework.notFound')}</Typography>
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
  // A quiz has its own page: one timed attempt instead of an upload
  if (data.assignment.type === 'QUIZ') return <QuizView data={data} />;
  return <HomeworkView data={data} refetch={refetch} />;
};

AssignmentPage.getLayout = layoutFor('STUDENT');
export default AssignmentPage;
