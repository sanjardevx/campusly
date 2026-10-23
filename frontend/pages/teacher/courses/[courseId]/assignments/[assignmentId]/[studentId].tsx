import { useState, type ReactNode } from 'react';
import type { GetStaticPaths } from 'next';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Avatar, Box, Button, Card, CircularProgress, Collapse, Divider, Link, Snackbar, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReplayIcon from '@mui/icons-material/Replay';
import { useTranslation } from 'next-i18next/pages';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { GRADE_SUBMISSION, RETURN_SUBMISSION } from '@/apollo/teacher/mutation';
import { ASSIGNMENT_SUBMISSIONS, GRADING_ASSIGNMENT, TEACHING_COURSES } from '@/apollo/teacher/query';
import { layoutFor } from '@/libs/components/layout';
import { fileType, formatSize } from '@/libs/components/teacher/course/model';
import { formatInZone, formatLocal, span, viewOf, type Attempt, type RowView } from '@/libs/components/teacher/grading/model';
import { StatusChip } from '@/libs/components/teacher/grading/StatusChip';
import { errorCode } from '@/libs/errors';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { useErrorText } from '@/libs/i18n';
import { formatLastSeen } from '@/libs/i18n/format';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });
export const getStaticProps = withTranslations(['teacher']);

/**
 * Stitch "Grade Submission: Aziz Karimov (Homework 5)": the student's file on the left, the grade
 * on the right, Previous / Next through the class in the table's order. The page key is the
 * student, so moving to the next one starts a fresh form.
 */
const SubmissionPage: NextPageWithLayout = () => {
  const router = useRouter();
  const studentId = String(router.query.studentId ?? '');
  return <SubmissionView key={studentId} />;
};

function SubmissionView() {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const router = useRouter();
  const { locale } = router;
  const courseId = String(router.query.courseId ?? '');
  const assignmentId = String(router.query.assignmentId ?? '');
  const studentId = String(router.query.studentId ?? '');
  const base = `/teacher/courses/${courseId}/assignments/${assignmentId}`;

  const { data: aData, error } = useQuery(GRADING_ASSIGNMENT, { variables: { id: assignmentId }, skip: !assignmentId });
  const { data: sData } = useQuery(ASSIGNMENT_SUBMISSIONS, { variables: { assignmentId }, skip: !assignmentId });
  const { data: courses } = useQuery(TEACHING_COURSES);
  const { data: settings } = useQuery(SCHOOL_SETTINGS);
  const zone = settings?.schoolSettings.timezone ?? 'Asia/Tashkent';
  const assignment = aData?.assignment;
  const rows = sData?.assignmentSubmissions ?? [];
  const index = rows.findIndex((r) => r.studentId === studentId);
  const row = index >= 0 ? rows[index] : null;
  const courseTitle = courses?.teachingCourses.find((c) => c.id === courseId)?.title;
  useCrumb(assignment && row ? [courseTitle, assignment.title, `${row.firstName} ${row.lastName}`].filter(Boolean).join(' › ') : null);

  const [score, setScore] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fileTab, setFileTab] = useState(0);
  const [history, setHistory] = useState(true);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [grade, gradeState] = useMutation(GRADE_SUBMISSION, { refetchQueries: ['AssignmentSubmissions'], awaitRefetchQueries: true });
  const [returnIt, returnState] = useMutation(RETURN_SUBMISSION, { refetchQueries: ['AssignmentSubmissions'], awaitRefetchQueries: true });

  if (error) return <Alert severity="error">{errorText(errorCode(error))}</Alert>;
  if (!assignment || !sData) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (!row) return <Alert severity="error">{errorText('NOT_FOUND')}</Alert>;

  const exam = assignment.type === 'EXAM';
  const view: RowView = viewOf(row, assignment);
  const s = row.submission;
  // The form starts from what is saved; typing overrides it
  const scoreText = score ?? (s?.score != null ? String(s.score) : '');
  const feedbackText = feedback ?? s?.feedback ?? '';
  const value = Number(scoreText);
  const scoreOk = scoreText.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= assignment.maxScore;
  const prev = index > 0 ? rows[index - 1] : null;
  const next = index < rows.length - 1 ? rows[index + 1] : null;
  const files = view.last?.files ?? [];
  const file = files[Math.min(fileTab, files.length - 1)];
  const earlier = s?.attempts.slice(0, -1) ?? [];
  const busy = gradeState.loading || returnState.loading;

  const save = async (goNext: boolean) => {
    try {
      await grade({ variables: { input: { assignmentId, studentId, score: value, feedback: feedbackText.trim() || undefined } } });
      if (goNext && next) void router.push(`${base}/${next.studentId}`);
      else setToast({ tone: 'success', text: t('grading.saved') });
    } catch (err) {
      setToast({ tone: 'error', text: errorText(errorCode(err)) });
    }
  };

  const giveBack = async () => {
    try {
      await returnIt({ variables: { input: { assignmentId, studentId, feedback: feedbackText.trim() || undefined } } });
      setScore(null);
      setToast({ tone: 'success', text: t('grading.returned') });
    } catch (err) {
      setToast({ tone: 'error', text: errorText(errorCode(err)) });
    }
  };

  /** "(2h 45m early)" / "(1h 12m late)" next to the hand-in time */
  const timing = () => {
    if (!view.last || !assignment.dueAt) return null;
    const minutes = Math.round((new Date(assignment.dueAt).getTime() - new Date(view.last.submittedAt).getTime()) / 60_000);
    return minutes >= 0 ? t('grading.early', { time: span(minutes) }) : t('grading.late', { time: span(-minutes) });
  };

  const detail = (label: string, content: ReactNode) => (
    <Stack direction="row" sx={{ py: 1.25, justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
      <Box sx={{ fontSize: '0.8125rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{content}</Box>
    </Stack>
  );

  return (
    <Stack spacing={2.5}>
      {/* Top: back, position in the class, previous / next */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button component={NextLink} href={base} startIcon={<ArrowBackIcon />} color="secondary" size="small">
          {t('grading.back')}
        </Button>
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.875rem', bgcolor: 'background.default', border: 1, borderColor: 'divider', px: 1.5, py: 0.25, borderRadius: 999, fontVariantNumeric: 'tabular-nums' }}>
            <b>{t('grading.studentN', { n: index + 1 })}</b> {t('grading.ofN', { total: rows.length })}
          </Typography>
          <Button size="small" variant="outlined" color="inherit" startIcon={<ChevronLeftIcon />} disabled={!prev} component={NextLink} href={prev ? `${base}/${prev.studentId}` : base} sx={{ borderColor: 'divider' }}>
            {t('grading.previous')}
          </Button>
          <Button size="small" variant="outlined" color="inherit" endIcon={<ChevronRightIcon />} disabled={!next} component={NextLink} href={next ? `${base}/${next.studentId}` : base} sx={{ borderColor: 'divider' }}>
            {t('grading.next')}
          </Button>
        </Stack>
      </Stack>

      {/* Identity */}
      <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
        <Avatar sx={{ width: 48, height: 48, bgcolor: '#BCEDDA', color: '#002118', fontWeight: 700 }}>
          {row.firstName[0]}
          {row.lastName[0]}
        </Avatar>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
          {row.firstName} {row.lastName}
        </Typography>
        <Typography component="span" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'background.default', border: 1, borderColor: 'divider', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', color: 'text.secondary' }}>
          ID {row.loginId}
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(0, 1fr)' } }}>
        {/* Left: the work */}
        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
            {exam ? (
              <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
                {t('grading.examNoFile')}
              </Typography>
            ) : !view.last ? (
              <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
                {t('grading.nothingYet')}
              </Typography>
            ) : (
              <>
                {files.length > 1 && (
                  <Tabs value={Math.min(fileTab, files.length - 1)} onChange={(_e, i: number) => setFileTab(i)} variant="scrollable" sx={{ px: 1, borderBottom: 1, borderColor: 'divider', minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none' } }}>
                    {files.map((f) => (
                      <Tab key={f.assetId} label={f.originalName} />
                    ))}
                  </Tabs>
                )}
                {file && (
                  <Stack direction="row" sx={{ px: 2, py: 1, gap: 1, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', minWidth: 0 }}>
                      <InsertDriveFileOutlinedIcon fontSize="small" color="primary" />
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }} noWrap>
                        {file.originalName}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', flexShrink: 0 }}>· {formatSize(file.size)}</Typography>
                    </Stack>
                    {file.url && (
                      <Stack direction="row" sx={{ gap: 0.5 }}>
                        <Button size="small" color="inherit" startIcon={<DownloadOutlinedIcon />} href={file.url} download={file.originalName}>
                          {t('grading.download')}
                        </Button>
                        <Button size="small" color="inherit" startIcon={<OpenInNewIcon />} href={file.url} target="_blank" rel="noopener">
                          {t('grading.openTab')}
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                )}
                {/* The browser's own PDF viewer brings pages and zoom; images are shown as they are */}
                <Box sx={{ bgcolor: '#E9EFEA', p: { xs: 1, sm: 2 }, display: 'flex', justifyContent: 'center' }}>
                  {file?.url && file.mimeType === 'application/pdf' ? (
                    <Box component="iframe" src={file.url} title={file.originalName} sx={{ width: '100%', height: { xs: 480, md: 820 }, border: 0, bgcolor: 'background.paper', borderRadius: 0.5 }} />
                  ) : file?.url && file.mimeType.startsWith('image/') ? (
                    <Box component="img" src={file.url} alt={file.originalName} sx={{ maxWidth: '100%', maxHeight: 820, bgcolor: 'background.paper', borderRadius: 0.5 }} />
                  ) : file ? (
                    <Typography color="text.secondary" sx={{ py: 6 }}>
                      {t('grading.noPreview', { type: fileType(file.mimeType) })}
                    </Typography>
                  ) : null}
                </Box>
                {view.last.text && (
                  <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{t('grading.answerText')}</Typography>
                    <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>{view.last.text}</Typography>
                  </Box>
                )}
              </>
            )}
          </Card>

          {earlier.length > 0 && (
            <Card variant="outlined" sx={{ borderRadius: '12px', p: 2 }}>
              <Button fullWidth color="inherit" onClick={() => setHistory(!history)} endIcon={<Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>{t('grading.historyHint')}</Typography>} startIcon={<ExpandMoreIcon sx={{ transform: history ? 'none' : 'rotate(-90deg)', transition: 'transform 150ms' }} />} sx={{ justifyContent: 'flex-start', fontWeight: 600 }}>
                {t('grading.previousAttempts', { count: earlier.length })}
              </Button>
              <Collapse in={history}>
                <Stack spacing={1} sx={{ mt: 1.5, pl: 3 }}>
                  {earlier.map((a: Attempt) => (
                    <Stack key={a.number} direction="row" sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: 'background.default', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                      <Stack direction="row" sx={{ gap: 1, alignItems: 'center', fontSize: '0.8125rem' }}>
                        <HistoryIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                        <b>{t('grading.attemptN', { n: a.number })}</b>
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                          · {formatLocal(a.submittedAt, locale)}
                        </Box>
                      </Stack>
                      <Stack direction="row" sx={{ gap: 1.5 }}>
                        {a.files.map((f) =>
                          f.url ? (
                            <Link key={f.assetId} href={f.url} download={f.originalName} underline="hover" sx={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                              <DownloadOutlinedIcon sx={{ fontSize: 14 }} />
                              {f.originalName}
                            </Link>
                          ) : null,
                        )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Collapse>
            </Card>
          )}
        </Stack>

        {/* Right: status and grade */}
        <Stack spacing={2.5}>
          <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontWeight: 600 }}>{t('grading.details')}</Typography>
              <StatusChip view={view} exam={exam} />
            </Stack>
            <Stack divider={<Divider flexItem />}>
              {!exam &&
                detail(
                  t('grading.col.submitted'),
                  view.last ? (
                    <>
                      {formatLocal(view.last.submittedAt, locale)}{' '}
                      <Box component="span" sx={{ color: view.last.isLate ? 'warning.dark' : 'secondary.main', fontWeight: 500 }}>
                        ({timing()})
                      </Box>
                    </>
                  ) : (
                    '—'
                  ),
                )}
              {!exam && detail(t('grading.attempts'), t('grading.attemptsOf', { used: s?.attempts.length ?? 0, max: assignment.maxAttempts }))}
              {detail(
                t('grading.dueDate'),
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  {assignment.dueAt ? `${formatInZone(assignment.dueAt, zone, locale)} (${zone.split('/').pop()?.replace('_', ' ')})` : '—'}
                </Box>,
              )}
            </Stack>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5 }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography component="label" htmlFor="grade-input" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                  {t('grading.grade')}
                </Typography>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mt: 0.75 }}>
                  <TextField
                    id="grade-input"
                    type="number"
                    value={scoreText}
                    onChange={(e) => setScore(e.target.value)}
                    error={scoreText !== '' && !scoreOk}
                    slotProps={{ htmlInput: { min: 0, max: assignment.maxScore, step: 0.5, style: { textAlign: 'center', fontSize: '1.25rem', fontWeight: 600 } } }}
                    sx={{ width: 96 }}
                  />
                  <Typography sx={{ fontSize: '1.125rem', color: 'text.disabled', fontWeight: 500 }}>/ {assignment.maxScore}</Typography>
                  {scoreOk && (
                    <Box sx={{ ml: 'auto', px: 1.25, py: 0.5, borderRadius: 1.5, bgcolor: '#E3F2EB', color: 'secondary.main', fontSize: '0.75rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round((value / assignment.maxScore) * 100)}%
                    </Box>
                  )}
                </Stack>
              </Box>
              <TextField
                label={t('grading.comment')}
                value={feedbackText}
                onChange={(e) => setFeedback(e.target.value)}
                multiline
                minRows={4}
                fullWidth
                slotProps={{ htmlInput: { maxLength: 5000 } }}
              />
              <Stack direction="row" sx={{ gap: 1, p: 1.25, borderRadius: 2, bgcolor: 'background.default', color: 'text.secondary' }}>
                <InfoOutlinedIcon fontSize="small" color="secondary" />
                <Typography sx={{ fontSize: '0.8125rem' }}>{assignment.gradesPublishedAt ? t('grading.noteLive') : t('grading.note')}</Typography>
              </Stack>
              <Stack spacing={1}>
                <Button variant="contained" disableElevation size="large" disabled={!scoreOk || busy} onClick={() => save(true)} endIcon={next ? <ArrowForwardIcon /> : undefined}>
                  {next ? t('grading.saveNext') : t('grading.save')}
                </Button>
                {next && (
                  <Button variant="outlined" color="inherit" disabled={!scoreOk || busy} onClick={() => save(false)} sx={{ borderColor: 'divider' }}>
                    {t('grading.save')}
                  </Button>
                )}
                {!exam && view.last && (
                  <Button color="inherit" size="small" startIcon={<ReplayIcon />} disabled={busy || s?.status === 'RETURNED'} onClick={giveBack} sx={{ color: 'text.secondary' }}>
                    {t('grading.returnRedo')}
                  </Button>
                )}
              </Stack>
            </Stack>
          </Card>

          {s?.gradedByName && s.gradedAt && (
            <Stack direction="row" sx={{ justifyContent: 'space-between', px: 2, py: 1, borderRadius: 2, bgcolor: 'background.default', fontSize: '0.75rem', color: 'text.disabled' }}>
              <span>{t('grading.modifiedBy', { name: s.gradedByName })}</span>
              <span>{formatLastSeen(s.gradedAt, locale, (key, options) => t(`grading.${key}`, options))}</span>
            </Stack>
          )}
        </Stack>
      </Box>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.tone ?? 'success'} variant="filled" onClose={() => setToast(null)}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

SubmissionPage.getLayout = layoutFor('TEACHER');
export default SubmissionPage;
