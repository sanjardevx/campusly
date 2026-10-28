import { useState } from 'react';
import type { GetStaticPaths } from 'next';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Box, Button, Card, CircularProgress, Link, Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useTranslation } from 'next-i18next/pages';
import { COURSE_QUESTIONS } from '@/apollo/qa/query';
import { STUDENT_COURSE } from '@/apollo/student/query';
import { layoutFor } from '@/libs/components/layout';
import { AskDrawer, type About } from '@/libs/components/qa/AskDrawer';
import { QuestionList } from '@/libs/components/qa/QuestionList';
import { STITCH, SegmentedTabs } from '@/libs/components/student/home/parts';
import type { QuestionTab } from '@/libs/gql/graphql';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });
export const getStaticProps = withTranslations(['student', 'qa']);

const PAGE = 20;
const TABS: QuestionTab[] = ['ALL', 'MINE', 'ANSWERED'];

/**
 * Stitch "Course Q&A: Algebra 9A": the course's questions (FAQ first), All / My questions /
 * Answered, and the "Ask a question" drawer. A lesson or homework page opens it with
 * ?lesson= / ?assignment= already picked as "About".
 */
const CourseQuestionsPage: NextPageWithLayout = () => {
  const { t } = useTranslation('qa');
  const router = useRouter();
  const courseId = typeof router.query.courseId === 'string' ? router.query.courseId : '';
  const { lesson, assignment } = router.query;
  const preset: About | null = typeof lesson === 'string' ? `lesson:${lesson}` : typeof assignment === 'string' ? `assignment:${assignment}` : router.query.ask ? '' : null;
  const [tab, setTab] = useState<QuestionTab>('ALL');
  const [limit, setLimit] = useState(PAGE);
  const [asking, setAsking] = useState<About | null>(preset);

  const course = useQuery(STUDENT_COURSE, { variables: { courseId }, skip: !courseId });
  const { data, error } = useQuery(COURSE_QUESTIONS, {
    variables: { input: { courseId, tab, limit } },
    skip: !courseId,
    fetchPolicy: 'cache-and-network',
  });
  const title = course.data?.courseDetail.title;
  useCrumb(title ? t('title') : null);

  if (error && !data) {
    return (
      <Card variant="outlined" sx={{ borderRadius: '12px', p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('notFound')}</Typography>
      </Card>
    );
  }
  if (!data || !course.data) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const list = data.courseQuestions;
  const counts: Record<QuestionTab, number> = { ALL: list.all, MINE: list.mine, ANSWERED: list.answered, UNANSWERED: list.unanswered };
  const weeks = [...course.data.courseDetail.modules].sort((a, b) => a.order - b.order);
  const lessons = weeks.flatMap((w) => [...w.lessons].sort((a, b) => a.order - b.order).map((l) => ({ id: l.id, title: l.title, week: w.title })));
  const assignments = course.data.courseAssignments.filter((a) => a.type !== 'QUIZ').map((a) => ({ id: a.id, title: a.title }));
  const back = `/student/courses/${courseId}`;

  const closeDrawer = () => {
    setAsking(null);
    // Drop ?ask / ?lesson / ?assignment so a reload does not open the drawer again
    if (preset !== null) void router.replace({ pathname: router.pathname, query: { courseId } }, undefined, { shallow: true });
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, fontSize: '0.8125rem', fontWeight: 600 }}>
        <Link component={NextLink} href={back} underline="none" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
          <ArrowBackRoundedIcon sx={{ fontSize: 16 }} />
          {title}
        </Link>
        <Box component="span" sx={{ color: '#C0C8C4' }}>
          /
        </Box>
        <Box component="span" sx={{ color: STITCH.ink }}>
          {t('title')}
        </Box>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}>
        <Box>
          <Typography component="h1" sx={{ fontSize: '1.5rem', lineHeight: '2rem', fontWeight: 600, letterSpacing: '-0.015em', color: STITCH.ink }}>
            {t('courseTitle', { course: title })}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 0.25 }}>{t('studentSubtitle')}</Typography>
        </Box>
        <Button variant="contained" disableElevation startIcon={<AddRoundedIcon />} onClick={() => setAsking('')} sx={{ flexShrink: 0 }}>
          {t('ask')}
        </Button>
      </Stack>

      <Box>
        <SegmentedTabs
          tabs={TABS.map((id) => ({ id, label: `${t(`tabs.${id}`)} (${counts[id]})` }))}
          value={tab}
          onChange={(id) => {
            setTab(id as QuestionTab);
            setLimit(PAGE);
          }}
        />
      </Box>

      <QuestionList items={list.list} staff={false} hrefOf={(q) => `/student/courses/${courseId}/questions/${q.id}`} empty={t(`empty.${tab}`)} />

      {list.total > list.list.length && (
        <Button color="inherit" onClick={() => setLimit((n) => n + PAGE)} sx={{ alignSelf: 'center' }}>
          {t('loadMore')}
        </Button>
      )}

      {asking !== null && (
        <AskDrawer
          courseId={courseId}
          lessons={lessons}
          assignments={assignments}
          initialAbout={asking}
          onClose={closeDrawer}
          onAsked={(id) => void router.push(`/student/courses/${courseId}/questions/${id}`)}
        />
      )}
    </Stack>
  );
};

CourseQuestionsPage.getLayout = layoutFor('STUDENT');
export default CourseQuestionsPage;
