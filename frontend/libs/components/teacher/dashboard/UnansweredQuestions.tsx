import NextLink from 'next/link';
import { useQuery } from '@apollo/client/react';
import { ButtonBase, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { COURSE_QUESTIONS } from '@/apollo/qa/query';
import { fadeUp } from '@/libs/components/dashboard/motion';
import { useAgo } from '@/libs/components/qa/QuestionList';
import { CourseTag, EmptyRow, HeaderLink, ListCard } from './parts';

/** Stitch "Unanswered questions": the newest questions of the teacher's courses no teacher answered yet */
export function UnansweredQuestions({ index }: { index: number }) {
  const { t } = useTranslation('qa');
  const ago = useAgo();
  const { data } = useQuery(COURSE_QUESTIONS, { variables: { input: { tab: 'UNANSWERED', limit: 4 } }, fetchPolicy: 'cache-and-network' });
  const list = data?.courseQuestions;

  return (
    <ListCard
      // The count sits in the title: a pill would wrap under it in the narrow side column
      title={list?.unanswered ? `${t('card.title')} (${list.unanswered})` : t('card.title')}
      action={<HeaderLink href="/teacher/questions">{t('card.all')}</HeaderLink>}
      sx={fadeUp(index)}
    >
      {list && list.list.length === 0 ? (
        <EmptyRow>{t('card.empty')}</EmptyRow>
      ) : (
        list?.list.map((q) => (
          <ButtonBase
            key={q.id}
            component={NextLink}
            href={`/teacher/questions/${q.id}`}
            sx={{ display: 'block', width: '100%', textAlign: 'left', px: 2.5, py: 1.75, transition: 'background-color 150ms', '&:hover': { bgcolor: 'background.default' } }}
          >
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{q.title}</Typography>
            <Stack direction="row" sx={{ mt: 0.75, alignItems: 'center', gap: 1, flexWrap: 'wrap', fontSize: '0.75rem', color: 'text.secondary' }}>
              <CourseTag>{q.courseTitle}</CourseTag>
              <span>
                {q.authorName} · {ago(q.createdAt)}
              </span>
            </Stack>
          </ButtonBase>
        ))
      )}
    </ListCard>
  );
}
