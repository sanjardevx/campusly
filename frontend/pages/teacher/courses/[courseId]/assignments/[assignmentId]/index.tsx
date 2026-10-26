import { useMemo, useState, type ReactNode } from 'react';
import type { GetStaticPaths } from 'next';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Pagination,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import GradeOutlinedIcon from '@mui/icons-material/GradeOutlined';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import UnpublishedOutlinedIcon from '@mui/icons-material/UnpublishedOutlined';
import { useTranslation } from 'next-i18next/pages';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { GIVE_ZERO_TO_MISSING, PUBLISH_GRADES } from '@/apollo/teacher/mutation';
import { ASSIGNMENT_SUBMISSIONS, GRADING_ASSIGNMENT, TEACHING_COURSES } from '@/apollo/teacher/query';
import { layoutFor } from '@/libs/components/layout';
import { downloadAllZip, formatInZone, formatLocal, matches, needsGrading, viewOf, type Filter } from '@/libs/components/teacher/grading/model';
import { QuizEditor } from '@/libs/components/teacher/grading/QuizEditor';
import { StatusChip } from '@/libs/components/teacher/grading/StatusChip';
import { errorCode } from '@/libs/errors';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { useErrorText } from '@/libs/i18n';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });
export const getStaticProps = withTranslations(['teacher']);

const FILTERS: Filter[] = ['ALL', 'NEEDS_GRADING', 'GRADED', 'NOT_SUBMITTED', 'LATE'];
const PAGE_SIZES = [28, 50, 100];
const REFETCH = { refetchQueries: ['AssignmentSubmissions', 'GradingAssignment'], awaitRefetchQueries: true };

/**
 * Stitch "Teacher Grading: Homework 5 (Moodle Table View)": every student of the course with their
 * hand-in and grade. Grades are saved for the teacher only; Publish grades shows them to students.
 */
const GradingPage: NextPageWithLayout = () => {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const router = useRouter();
  const { locale } = router;
  const courseId = String(router.query.courseId ?? '');
  const assignmentId = String(router.query.assignmentId ?? '');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(28);
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<'zero' | 'publish' | 'unpublish' | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [zipping, setZipping] = useState<{ done: number; total: number } | null>(null);

  const { data: aData, error } = useQuery(GRADING_ASSIGNMENT, { variables: { id: assignmentId }, skip: !assignmentId });
  const { data: sData } = useQuery(ASSIGNMENT_SUBMISSIONS, { variables: { assignmentId }, skip: !assignmentId, fetchPolicy: 'cache-and-network' });
  const { data: courses } = useQuery(TEACHING_COURSES);
  const { data: settings } = useQuery(SCHOOL_SETTINGS);
  const zone = settings?.schoolSettings.timezone ?? 'Asia/Tashkent';
  const assignment = aData?.assignment;
  const courseTitle = courses?.teachingCourses.find((c) => c.id === courseId)?.title;
  useCrumb(assignment ? [courseTitle, assignment.title].filter(Boolean).join(' › ') : null);

  const [giveZero, zeroState] = useMutation(GIVE_ZERO_TO_MISSING, REFETCH);
  const [publish, publishState] = useMutation(PUBLISH_GRADES, REFETCH);

  const views = useMemo(() => (assignment ? (sData?.assignmentSubmissions ?? []).map((r) => viewOf(r, assignment)) : []), [sData, assignment]);

  if (error) return <Alert severity="error">{errorText(errorCode(error))}</Alert>;
  if (!assignment || !sData) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const exam = assignment.type === 'EXAM';
  const tab = assignment.type === 'QUIZ' && router.query.tab === 'questions' ? 'questions' : 'results';
  const total = views.length;
  const count = (f: Filter) => views.filter((v) => matches(v, f)).length;
  const graded = count('GRADED');
  const percent = total ? Math.round((graded / total) * 100) : 0;
  const query = search.trim().toLowerCase();
  const shown = views.filter(
    (v) => matches(v, filter) && (!query || `${v.row.firstName} ${v.row.lastName} ${v.row.lastName} ${v.row.loginId}`.toLowerCase().includes(query)),
  );
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const current = Math.min(page, pages);
  const pageRows = shown.slice((current - 1) * pageSize, current * pageSize);
  const pastDue = !!assignment.dueAt && new Date(assignment.dueAt) < new Date();
  const published = !!assignment.gradesPublishedAt;
  const fileCount = views.reduce((n, v) => n + (v.last?.files.length ?? 0), 0);

  const run = async (action: 'zero' | 'publish' | 'unpublish') => {
    try {
      if (action === 'zero') {
        const res = await giveZero({ variables: { assignmentId } });
        setToast({ tone: 'success', text: t('grading.zeroDone', { count: res.data?.giveZeroToMissing ?? 0 }) });
      } else {
        await publish({ variables: { input: { assignmentId, publish: action === 'publish' } } });
        setToast({ tone: 'success', text: action === 'publish' ? t('grading.publishedDone') : t('grading.unpublishedDone') });
      }
    } catch (err) {
      setToast({ tone: 'error', text: errorText(errorCode(err)) });
    } finally {
      setConfirm(null);
    }
  };

  const zip = async () => {
    try {
      setZipping({ done: 0, total: fileCount });
      await downloadAllZip(views, assignment.title.replace(/[\\/:*?"<>|]/g, ' '), (done, all) => setZipping({ done, total: all }));
    } catch {
      setToast({ tone: 'error', text: t('grading.zipFailed') });
    } finally {
      setZipping(null);
    }
  };

  const chip = (icon: ReactNode, text: string, tone?: 'good') => (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        border: 1,
        fontSize: '0.6875rem',
        fontWeight: 500,
        color: tone ? 'secondary.main' : 'text.secondary',
        bgcolor: tone ? '#E3F2EB' : 'background.default',
        borderColor: tone ? '#CFE3D6' : 'divider',
        '& svg': { fontSize: 14, color: 'secondary.main' },
      }}
    >
      {icon}
      {text}
    </Stack>
  );

  const tally = (color: string, bg: string, text: string, bold?: boolean) => (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 1.5, bgcolor: bg, fontSize: '0.75rem', fontWeight: bold ? 700 : 600, fontVariantNumeric: 'tabular-nums' }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
      {text}
    </Stack>
  );

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ gap: 2, justifyContent: 'space-between', alignItems: { lg: 'center' } }}>
        <Stack spacing={1}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {assignment.title}
          </Typography>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {chip(
              <EventOutlinedIcon />,
              assignment.dueAt ? t('grading.due', { date: formatInZone(assignment.dueAt, zone, locale), zone: zone.split('/').pop()?.replace('_', ' ') }) : t('course.item.noDue'),
            )}
            {chip(<GradeOutlinedIcon />, t('grading.maxScore', { score: assignment.maxScore }))}
            {assignment.type === 'QUIZ' && assignment.timeLimitMin && chip(<TimerOutlinedIcon />, t('quiz.minutes', { count: assignment.timeLimitMin }))}
            {!exam && assignment.type !== 'QUIZ' &&
              (assignment.allowLate
                ? chip(<CheckCircleOutlineOutlinedIcon />, t('grading.lateOn'), 'good')
                : chip(<HighlightOffOutlinedIcon />, t('grading.lateOff')))}
            {!exam && assignment.maxAttempts > 1 && chip(<SyncOutlinedIcon />, t('grading.resubmissions', { count: assignment.maxAttempts }))}
          </Stack>
        </Stack>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
          {!exam && assignment.type !== 'QUIZ' && (
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={zipping ? <CircularProgress size={14} color="inherit" /> : <DownloadOutlinedIcon />}
              onClick={zip}
              disabled={!fileCount || !!zipping}
              sx={{ borderColor: 'divider' }}
            >
              {zipping ? t('grading.zipping', { done: zipping.done, total: zipping.total }) : t('grading.zip')}
            </Button>
          )}
          <Button variant="outlined" color="inherit" size="small" onClick={() => setConfirm('zero')} disabled={!pastDue || published} sx={{ borderColor: 'divider' }}>
            {t('grading.zero')}
          </Button>
          {published ? (
            <Button variant="outlined" color="inherit" size="small" startIcon={<UnpublishedOutlinedIcon />} onClick={() => setConfirm('unpublish')} sx={{ borderColor: 'divider' }}>
              {t('grading.unpublish')}
            </Button>
          ) : (
            <Button variant="contained" disableElevation size="small" startIcon={<PublishOutlinedIcon />} onClick={() => setConfirm('publish')} disabled={!graded}>
              {t('grading.publish')}
            </Button>
          )}
        </Stack>
      </Stack>

      {published && (
        <Alert severity="success" variant="outlined">
          {t('grading.publishedNote', { date: formatLocal(assignment.gradesPublishedAt!, locale) })}
        </Alert>
      )}

      {/* A quiz: its students' results, or its questions */}
      {assignment.type === 'QUIZ' && (
        <Tabs
          value={tab}
          onChange={(_e, next: 'results' | 'questions') => void router.replace({ query: { ...router.query, tab: next } }, undefined, { shallow: true })}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="results" label={t('quiz.tabResults')} />
          <Tab value="questions" label={t('quiz.tabQuestions')} />
        </Tabs>
      )}
      {tab === 'questions' ? (
        <QuizEditor assignmentId={assignment.id} publishedAt={assignment.publishedAt ?? null} />
      ) : (
      <>
      {/* Summary */}
      <Card variant="outlined" sx={{ borderRadius: '12px', p: 1.75 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.25 }}>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {!exam && tally('#3A6758', '#E3F2EB', t('grading.tally.submitted', { count: views.filter((v) => v.last && v.state !== 'LATE').length }))}
            {!exam && tally('#FF9B61', '#FFF0E8', t('grading.tally.late', { count: count('LATE') }))}
            {tally('#BA1A1A', '#FFF1EF', exam ? t('grading.tally.notGraded', { count: total - graded }) : t('grading.tally.notSubmitted', { count: count('NOT_SUBMITTED') }))}
            {tally('#1F4E43', '#E8EFEA', t('grading.tally.graded', { graded, total }), true)}
          </Stack>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'secondary.main', fontVariantNumeric: 'tabular-nums' }}>
            {t('grading.progress', { graded, total, percent })}
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={percent} sx={{ height: 6, borderRadius: 3, bgcolor: 'background.default' }} />
      </Card>

      {/* Filters */}
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 1.5, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          onChange={(_e, value: Filter | null) => {
            if (value) {
              setFilter(value);
              setPage(1);
            }
          }}
          sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.75rem', px: 1.5, py: 0.5 } }}
        >
          {FILTERS.filter((f) => !exam || f === 'ALL' || f === 'GRADED' || f === 'NOT_SUBMITTED').map((f) => (
            <ToggleButton key={f} value={f}>
              {t(`grading.filter.${f}`, { count: f === 'NOT_SUBMITTED' && exam ? total - graded : count(f) })}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
          <TextField
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('grading.search')}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            sx={{ width: { xs: '100%', md: 260 } }}
          />
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('grading.perPage')}</Typography>
            <Select size="small" value={pageSize} onChange={(e) => (setPageSize(Number(e.target.value)), setPage(1))} sx={{ fontSize: '0.75rem' }}>
              {PAGE_SIZES.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        </Stack>
      </Stack>

      {/* Table */}
      <Card variant="outlined" sx={{ borderRadius: '12px' }}>
        <TableContainer>
          <Table size="small" sx={{ '& td, & th': { fontSize: '0.75rem' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', fontSize: '0.6875rem', bgcolor: 'background.default' } }}>
                <TableCell align="center" sx={{ width: 40 }}>
                  #
                </TableCell>
                <TableCell sx={{ width: 110 }}>{t('grading.col.id')}</TableCell>
                <TableCell>{t('grading.col.name')}</TableCell>
                <TableCell sx={{ width: 150 }}>{t('grading.col.status')}</TableCell>
                {!exam && <TableCell sx={{ width: 140 }}>{t('grading.col.submitted')}</TableCell>}
                <TableCell sx={{ width: 100 }}>{t('grading.col.grade')}</TableCell>
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {t('grading.empty')}
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((v) => {
                const href = `/teacher/courses/${courseId}/assignments/${assignmentId}/${v.row.studentId}`;
                const index = views.indexOf(v) + 1;
                const bg = v.state === 'NOT_SUBMITTED' && !exam ? 'rgba(186,26,26,0.03)' : v.state === 'LATE' ? 'rgba(180,83,9,0.04)' : undefined;
                return (
                  <TableRow key={v.row.studentId} hover onClick={() => router.push(href)} sx={{ cursor: 'pointer', bgcolor: bg }}>
                    <TableCell align="center" sx={{ color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
                      {index}
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>{v.row.loginId}</TableCell>
                    <TableCell>
                      <Typography component={NextLink} href={href} onClick={(e) => e.stopPropagation()} sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', textDecoration: 'none' }}>
                        {v.row.firstName} {v.row.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip view={v} exam={exam} />
                    </TableCell>
                    {!exam && (
                      <TableCell sx={{ color: v.state === 'LATE' ? 'warning.dark' : 'text.secondary', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {v.last ? formatLocal(v.last.submittedAt, locale) : '—'}
                      </TableCell>
                    )}
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {v.score !== null ? (
                        <>
                          <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {v.score}
                          </Box>
                          <Box component="span" sx={{ color: 'text.disabled' }}>
                            {' '}
                            / {assignment.maxScore}
                          </Box>
                        </>
                      ) : (
                        <Box component="span" sx={{ color: needsGrading(v) ? 'warning.dark' : 'text.disabled' }}>
                          —
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: 'text.disabled' }}>
                      <ChevronRightIcon fontSize="small" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Pagination count={pages} page={current} onChange={(_e, p) => setPage(p)} size="small" shape="rounded" />
          </Box>
        )}
      </Card>
      </>
      )}

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirm && t(`grading.confirm.${confirm}.title`)}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {confirm && t(`grading.confirm.${confirm}.body`, { count: count('NOT_SUBMITTED'), graded, total })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" color="inherit" onClick={() => setConfirm(null)} sx={{ borderColor: 'divider' }}>
            {t('course.cancel')}
          </Button>
          <Button
            variant="contained"
            disableElevation
            disabled={zeroState.loading || publishState.loading}
            onClick={() => confirm && run(confirm)}
            startIcon={zeroState.loading || publishState.loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {confirm && t(`grading.confirm.${confirm}.action`)}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.tone ?? 'success'} variant="filled" onClose={() => setToast(null)}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </Stack>
  );
};

GradingPage.getLayout = layoutFor('TEACHER');
export default GradingPage;
