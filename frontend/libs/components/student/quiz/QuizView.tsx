import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  FormControlLabel,
  LinearProgress,
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { useTranslation } from 'next-i18next/pages';
import { SAVE_QUIZ_ANSWER, START_QUIZ, SUBMIT_QUIZ } from '@/apollo/student/mutation';
import { MY_QUIZ, QUIZ_RESULT } from '@/apollo/student/query';
import { MarkdownText } from '@/libs/components/MarkdownText';
import { formatDueAt, studentHref } from '@/libs/components/student/home/due';
import { STITCH, SoftPill, enter } from '@/libs/components/student/home/parts';
import { errorCode } from '@/libs/errors';
import type { MyQuizQuery, QuizResultQuery, StudentAssignmentQuery } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';

type Quiz = MyQuizQuery['myQuiz'];
type Question = Quiz['questions'][number];
type Result = QuizResultQuery['quizResult'];

const cardSx = { borderRadius: '12px', borderColor: STITCH.outline, boxShadow: STITCH.rowShadow };

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 1.5, bgcolor: STITCH.surfaceContainer, color: STITCH.onSurfaceVariant, fontSize: '0.8125rem', fontWeight: 500, '& svg': { fontSize: 16 } }}>
      {icon}
      {children}
    </Stack>
  );
}

/**
 * A quiz for its student (DECISIONS log 2026-10-27): start → one timed attempt (the server's clock
 * decides; answers are saved one by one) → submitted → after the grades are published, the score
 * with right / wrong per question and the right answers.
 */
export function QuizView({ data }: { data: StudentAssignmentQuery }) {
  const { t } = useTranslation('student');
  const errorText = useErrorText();
  const { locale } = useRouter();
  const { assignment: a, mySubmission: sub, courseDetail: course } = data;
  const published = !!a.gradesPublishedAt;

  const quizQuery = useQuery(MY_QUIZ, { variables: { assignmentId: a.id }, fetchPolicy: 'network-only' });
  const resultQuery = useQuery(QUIZ_RESULT, { variables: { assignmentId: a.id }, skip: !published, fetchPolicy: 'network-only' });
  const [start, startState] = useMutation(START_QUIZ);
  const [submit, submitState] = useMutation(SUBMIT_QUIZ);
  const [confirm, setConfirm] = useState<'start' | 'submit' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quiz = startState.data?.startQuiz ?? quizQuery.data?.myQuiz;
  const state = submitState.data ? 'SUBMITTED' : quiz?.state;

  const run = async (action: 'start' | 'submit') => {
    setConfirm(null);
    setError(null);
    try {
      if (action === 'start') await start({ variables: { assignmentId: a.id } });
      else await submit({ variables: { assignmentId: a.id } });
      await quizQuery.refetch();
    } catch (err) {
      setError(errorText(errorCode(err)));
      await quizQuery.refetch();
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 860 }}>
      {/* Breadcrumb */}
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, fontSize: '0.84375rem', color: 'text.secondary', pb: 1, borderBottom: 1, borderColor: STITCH.outlineSoft, minWidth: 0 }}>
        <Link component={NextLink} href="/student/courses" underline="hover" sx={{ display: 'inline-flex', color: 'inherit' }}>
          <MenuBookOutlinedIcon sx={{ fontSize: 18 }} />
        </Link>
        <Box component="span" sx={{ color: '#C0C8C4' }}>›</Box>
        <Link component={NextLink} href={studentHref.course(course.id)} underline="hover" sx={{ color: 'inherit', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {course.title}
        </Link>
        <Box component="span" sx={{ color: '#C0C8C4' }}>›</Box>
        <Typography noWrap sx={{ fontSize: 'inherit', fontWeight: 600, color: 'text.primary' }}>
          {a.title}
        </Typography>
      </Stack>

      {/* The quiz */}
      <Card variant="outlined" sx={{ ...cardSx, p: { xs: 2, md: 3 }, ...enter(0) }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'secondary.main' }}>{t('quiz.label')}</Typography>
        <Typography component="h1" sx={{ mt: 0.5, fontSize: { xs: '1.375rem', md: '1.5rem' }, lineHeight: 1.3, fontWeight: 600, color: STITCH.ink }}>
          {a.title}
        </Typography>
        <Stack direction="row" sx={{ mt: 1.5, gap: 1, flexWrap: 'wrap' }}>
          {a.dueAt && <Chip icon={<EventOutlinedIcon />}>{t('quiz.due', { date: formatDueAt(a.dueAt, locale) })}</Chip>}
          {a.timeLimitMin && <Chip icon={<TimerOutlinedIcon />}>{t('quiz.minutes', { count: a.timeLimitMin })}</Chip>}
          {quiz && <Chip icon={<HelpOutlineRoundedIcon />}>{t('quiz.questions', { count: quiz.questionCount, points: quiz.totalPoints })}</Chip>}
        </Stack>
        {a.instructions?.trim() && <MarkdownText text={a.instructions} sx={{ mt: 2, fontSize: '0.9375rem', lineHeight: 1.7 }} />}
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {!quiz ? (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : state === 'IN_PROGRESS' ? (
        <Attempt quiz={quiz} onSubmit={() => setConfirm('submit')} onTimeUp={() => void quizQuery.refetch()} submitting={submitState.loading} />
      ) : state === 'SUBMITTED' || sub?.submittedAt ? (
        published ? (
          <Review result={resultQuery.data?.quizResult} score={sub?.score ?? null} maxScore={a.maxScore} loading={resultQuery.loading} />
        ) : (
          <Card variant="outlined" sx={{ ...cardSx, p: 3, textAlign: 'center' }}>
            <CloudDoneOutlinedIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
            <Typography sx={{ mt: 1, fontWeight: 600 }}>{t('quiz.submittedTitle')}</Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>{t('quiz.submittedBody')}</Typography>
          </Card>
        )
      ) : published && sub?.score != null ? (
        <Review result={undefined} score={sub.score} maxScore={a.maxScore} loading={false} />
      ) : quiz.canStart ? (
        <Card variant="outlined" sx={{ ...cardSx, p: 3 }}>
          <Typography sx={{ fontWeight: 600 }}>{t('quiz.readyTitle')}</Typography>
          <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
            {t('quiz.readyBody', { count: quiz.timeLimitMin ?? 0 })}
          </Typography>
          <Button variant="contained" size="large" disableElevation sx={{ mt: 2 }} disabled={startState.loading} onClick={() => setConfirm('start')}>
            {t('quiz.start')}
          </Button>
        </Card>
      ) : (
        <Alert severity="info">{quiz.questionCount === 0 ? t('quiz.notReady') : t('quiz.closed')}</Alert>
      )}

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirm && t(`quiz.confirm.${confirm}.title`)}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {confirm && t(`quiz.confirm.${confirm}.body`, { count: quiz?.timeLimitMin ?? 0 })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setConfirm(null)}>
            {t('quiz.cancel')}
          </Button>
          <Button variant="contained" disableElevation onClick={() => confirm && void run(confirm)}>
            {confirm && t(`quiz.confirm.${confirm}.action`)}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

/** The running attempt: a timer on the server's clock and the questions, each saved at once */
function Attempt({ quiz, onSubmit, onTimeUp, submitting }: { quiz: Quiz; onSubmit: () => void; onTimeUp: () => void; submitting: boolean }) {
  const { t } = useTranslation('student');
  // The device clock may be wrong: count with the difference to the server's clock
  const [offset] = useState(() => new Date(quiz.serverNow).getTime() - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  const [answers, setAnswers] = useState<Record<string, { choice?: number | null; number?: string }>>(() =>
    Object.fromEntries(quiz.questions.map((q) => [q.id, { choice: q.myChoice, number: q.myNumber == null ? '' : String(q.myNumber) }])),
  );
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(quiz.questions.filter((q) => q.myChoice != null || q.myNumber != null).map((q) => q.id)));
  const [failed, setFailed] = useState<string | null>(null);
  const [save] = useMutation(SAVE_QUIZ_ANSWER);
  const timeUpCalled = useRef(false);

  const deadline = new Date(quiz.deadlineAt!).getTime();
  const left = deadline - now;
  const total = (quiz.timeLimitMin ?? 1) * 60_000;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(timer);
  }, [offset]);
  useEffect(() => {
    // Time is up: the server grades the saved answers; reading the quiz again shows "submitted"
    if (left <= 0 && !timeUpCalled.current) {
      timeUpCalled.current = true;
      setTimeout(onTimeUp, 1500);
    }
  }, [left, onTimeUp]);

  const send = async (q: Question, input: { choice?: number; number?: number }) => {
    setFailed(null);
    try {
      await save({ variables: { input: { assignmentId: quiz.assignmentId, questionId: q.id, ...input } } });
      setSavedIds((s) => new Set(s).add(q.id));
    } catch (err) {
      const code = errorCode(err);
      setFailed(code);
      if (code === 'QUIZ_TIME_UP') onTimeUp();
    }
  };

  const answered = savedIds.size;
  const warn = left < 60_000;

  return (
    <Stack spacing={2}>
      {/* Timer: stays on top while scrolling */}
      <Card
        variant="outlined"
        sx={{ ...cardSx, position: 'sticky', top: { xs: 56, md: 72 }, zIndex: 2, px: 2, py: 1.25, bgcolor: warn ? '#FFF1EF' : 'background.paper' }}
        role="timer"
        aria-live="off"
      >
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
          <TimerOutlinedIcon sx={{ color: warn ? 'error.main' : 'secondary.main' }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', fontVariantNumeric: 'tabular-nums', color: warn ? 'error.main' : STITCH.ink }}>
            {mmss(left)}
          </Typography>
          <Box sx={{ flex: 1 }}>
            <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, (left / total) * 100))} color={warn ? 'error' : 'secondary'} sx={{ height: 6, borderRadius: 3 }} />
          </Box>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {t('quiz.answered', { done: answered, total: quiz.questions.length })}
          </Typography>
        </Stack>
      </Card>

      {quiz.questions.map((q, i) => {
        const value = answers[q.id] ?? {};
        return (
          <Card key={q.id} variant="outlined" sx={{ ...cardSx, p: { xs: 2, md: 2.5 } }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, mb: 1 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em' }}>
                {t('quiz.questionN', { n: i + 1, total: quiz.questions.length })}
              </Typography>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                {savedIds.has(q.id) && <SoftPill tone="mint">{t('quiz.saved')}</SoftPill>}
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('quiz.points', { count: q.points })}</Typography>
              </Stack>
            </Stack>
            <Typography sx={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>{q.text}</Typography>

            {q.type === 'NUMBER' ? (
              <TextField
                size="small"
                type="number"
                sx={{ mt: 1.5, maxWidth: 240 }}
                label={t('quiz.yourAnswer')}
                value={value.number ?? ''}
                onChange={(e) => setAnswers((all) => ({ ...all, [q.id]: { number: e.target.value } }))}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== '' && Number.isFinite(Number(v))) void send(q, { number: Number(v) });
                }}
                slotProps={{ htmlInput: { step: 'any', inputMode: 'decimal' } }}
              />
            ) : (
              <RadioGroup
                sx={{ mt: 1 }}
                value={value.choice == null ? '' : String(value.choice)}
                onChange={(e) => {
                  const choice = Number(e.target.value);
                  setAnswers((all) => ({ ...all, [q.id]: { choice } }));
                  void send(q, { choice });
                }}
              >
                {(q.type === 'TRUE_FALSE' ? [t('quiz.true'), t('quiz.false')] : q.options).map((option, j) => {
                  // True / false: 1 = true, 0 = false; multiple choice: the position shown
                  const v = q.type === 'TRUE_FALSE' ? 1 - j : j;
                  return <FormControlLabel key={j} value={String(v)} control={<Radio size="small" />} label={option} sx={{ my: 0.25 }} />;
                })}
              </RadioGroup>
            )}
          </Card>
        );
      })}

      {failed && <Alert severity="error">{failed === 'QUIZ_TIME_UP' ? t('quiz.timeUp') : t('quiz.saveFailed')}</Alert>}

      <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1, alignItems: 'center' }}>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{t('quiz.submitHint')}</Typography>
        <Button variant="contained" size="large" disableElevation onClick={onSubmit} disabled={submitting || left <= 0}>
          {t('quiz.submit')}
        </Button>
      </Stack>
    </Stack>
  );
}

/** After the grades are published: the score, and right / wrong per question with the right answer */
function Review({ result, score, maxScore, loading }: { result: Result | undefined; score: number | null; maxScore: number; loading: boolean }) {
  const { t } = useTranslation('student');
  const shown = result?.score ?? score ?? 0;
  const max = result?.maxScore ?? maxScore;
  const answerText = (item: Result['items'][number], which: 'mine' | 'right') => {
    if (item.type === 'NUMBER') {
      const n = which === 'mine' ? item.myNumber : item.correctNumber;
      if (n == null) return t('quiz.noAnswer');
      return which === 'right' && item.tolerance ? `${n} ± ${item.tolerance}` : String(n);
    }
    const c = which === 'mine' ? item.myChoice : item.correctOption;
    if (c == null) return t('quiz.noAnswer');
    return item.type === 'TRUE_FALSE' ? (c === 1 ? t('quiz.true') : t('quiz.false')) : (item.options[c] ?? '—');
  };

  return (
    <Stack spacing={2}>
      <Card variant="outlined" sx={{ ...cardSx, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>{t('quiz.score')}</Typography>
          <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: STITCH.ink, fontVariantNumeric: 'tabular-nums' }}>
            {shown} / {max}
          </Typography>
        </Box>
      </Card>
      {loading && <LinearProgress />}
      {result?.items.map((item, i) => (
        <Card key={i} variant="outlined" sx={{ ...cardSx, p: 2, borderLeft: 4, borderLeftColor: item.isCorrect ? 'success.main' : 'error.main' }}>
          <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-start' }}>
            {item.isCorrect ? <CheckCircleRoundedIcon color="success" fontSize="small" /> : <CancelRoundedIcon color="error" fontSize="small" />}
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>{item.text}</Typography>
              <Typography sx={{ mt: 0.5, fontSize: '0.875rem' }}>
                {t('quiz.yourAnswerIs', { answer: answerText(item, 'mine') })}
              </Typography>
              {!item.isCorrect && (
                <Typography sx={{ fontSize: '0.875rem', color: 'success.dark' }}>{t('quiz.rightAnswerIs', { answer: answerText(item, 'right') })}</Typography>
              )}
            </Box>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {item.earned} / {item.points}
            </Typography>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
