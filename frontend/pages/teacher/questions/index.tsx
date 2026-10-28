import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Button, Card, CircularProgress, InputAdornment, MenuItem, Select, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'next-i18next/pages';
import { COURSE_QUESTIONS } from '@/apollo/qa/query';
import { TEACHING_COURSES } from '@/apollo/teacher/query';
import { layoutFor } from '@/libs/components/layout';
import { QuestionList } from '@/libs/components/qa/QuestionList';
import { errorCode } from '@/libs/errors';
import type { QuestionTab } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['teacher', 'qa']);

const PAGE = 20;
const TABS: QuestionTab[] = ['UNANSWERED', 'ANSWERED', 'ALL'];

/**
 * Stitch "Teacher Q&A Inbox": the questions of the teacher's courses, Unanswered first (the
 * server limits the list to their own courses). The course filter lives in the URL (?course=).
 */
const QuestionsInboxPage: NextPageWithLayout = () => {
  const { t } = useTranslation('qa');
  const errorText = useErrorText();
  const router = useRouter();
  const courseId = typeof router.query.course === 'string' ? router.query.course : undefined;
  const [tab, setTab] = useState<QuestionTab>('UNANSWERED');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const { data: coursesData } = useQuery(TEACHING_COURSES);
  const courses = (coursesData?.teachingCourses ?? []).filter((c) => c.status !== 'DRAFT');
  const { data, error, loading } = useQuery(COURSE_QUESTIONS, {
    variables: { input: { courseId, tab, search: query || undefined, limit } },
    fetchPolicy: 'cache-and-network',
  });
  const list = data?.courseQuestions;
  const counts: Record<QuestionTab, number> = { ALL: list?.all ?? 0, MINE: 0, ANSWERED: list?.answered ?? 0, UNANSWERED: list?.unanswered ?? 0 };

  const setCourse = (value: string) => {
    const q = { ...router.query, course: value || undefined };
    if (!value) delete q.course;
    void router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
    setLimit(PAGE);
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
          {t('title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
          {t('teacherSubtitle')}
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5 }}>
        <Select size="small" value={courseId ?? ''} displayEmpty onChange={(e) => setCourse(e.target.value)} sx={{ minWidth: 230, fontSize: '0.875rem', bgcolor: 'background.paper' }} inputProps={{ 'aria-label': t('course') }}>
          <MenuItem value="">{t('allCourses', { count: courses.length })}</MenuItem>
          {courses.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.title}
            </MenuItem>
          ))}
        </Select>
        <TextField
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setQuery(search.trim()), setLimit(PAGE))}
          onBlur={() => setQuery(search.trim())}
          placeholder={t('search')}
          sx={{ bgcolor: 'background.paper' }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value: QuestionTab) => {
          setTab(value);
          setLimit(PAGE);
        }}
        sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40 }}
      >
        {TABS.map((id) => (
          <Tab
            key={id}
            value={id}
            sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
            label={
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
                {t(`tabs.${id}`)}
                <Box component="span" sx={{ px: 0.75, borderRadius: 1, bgcolor: 'background.default', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
                  {counts[id]}
                </Box>
              </Stack>
            }
          />
        ))}
      </Tabs>

      {error && <Alert severity="error">{errorText(errorCode(error))}</Alert>}
      {!list && loading ? (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        list && (
          <>
            <QuestionList items={list.list} staff hrefOf={(q) => `/teacher/questions/${q.id}`} empty={query ? t('noResults') : t(`empty.staff${tab}`)} />
            {list.total > list.list.length && (
              <Button color="inherit" onClick={() => setLimit((n) => n + PAGE)} sx={{ alignSelf: 'center' }}>
                {t('loadMore')}
              </Button>
            )}
          </>
        )
      )}
      {!courses.length && coursesData && (
        <Card variant="outlined" sx={{ borderRadius: '12px', p: 3 }}>
          <Typography color="text.secondary">{t('noCourses')}</Typography>
        </Card>
      )}
    </Stack>
  );
};

QuestionsInboxPage.getLayout = layoutFor('TEACHER');
export default QuestionsInboxPage;
