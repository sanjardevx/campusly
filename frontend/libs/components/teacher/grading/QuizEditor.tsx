import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'next-i18next/pages';
import { PUBLISH_ASSIGNMENT, SET_QUIZ_QUESTIONS } from '@/apollo/teacher/mutation';
import { QUIZ_EDITOR } from '@/apollo/teacher/query';
import { errorCode } from '@/libs/errors';
import type { QuizQuestionType } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';

const TYPES: QuizQuestionType[] = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'NUMBER'];
const MAX_OPTIONS = 6;
const MAX_QUESTIONS = 50;

/** One question while it is edited: numbers stay text until saved */
interface Draft {
  key: string;
  type: QuizQuestionType;
  text: string;
  points: string;
  options: string[];
  correctOption: number | null;
  correctNumber: string;
  tolerance: string;
}

let nextKey = 0;
const blank = (type: QuizQuestionType): Draft => ({
  key: `new-${nextKey++}`,
  type,
  text: '',
  points: '1',
  options: type === 'MULTIPLE_CHOICE' ? ['', ''] : [],
  correctOption: null,
  correctNumber: '',
  tolerance: '',
});

const isNumber = (v: string) => v.trim() !== '' && Number.isFinite(Number(v));

function problem(d: Draft): string | null {
  if (!d.text.trim()) return 'quiz.problem.text';
  const points = Number(d.points);
  if (!isNumber(d.points) || points < 0.5 || points > 100) return 'quiz.problem.points';
  if (d.type === 'MULTIPLE_CHOICE') {
    if (d.options.length < 2 || d.options.some((o) => !o.trim())) return 'quiz.problem.options';
    if (d.correctOption === null || d.correctOption >= d.options.length) return 'quiz.problem.correct';
  }
  if (d.type === 'TRUE_FALSE' && d.correctOption === null) return 'quiz.problem.correct';
  if (d.type === 'NUMBER') {
    if (!isNumber(d.correctNumber)) return 'quiz.problem.number';
    if (d.tolerance.trim() && (!isNumber(d.tolerance) || Number(d.tolerance) < 0)) return 'quiz.problem.tolerance';
  }
  return null;
}

/**
 * The quiz's questions (teachers): multiple choice, true / false, number. Saved as one list; once a
 * student has started the list is locked (read only). A draft quiz is published from here when ready.
 */
export function QuizEditor({ assignmentId, publishedAt }: { assignmentId: string; publishedAt: string | null }) {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const { data, loading } = useQuery(QUIZ_EDITOR, { variables: { assignmentId }, fetchPolicy: 'cache-and-network' });
  const [saveQuestions, saveState] = useMutation(SET_QUIZ_QUESTIONS, {
    refetchQueries: ['GradingAssignment', 'QuizEditor'],
    awaitRefetchQueries: true,
  });
  const [publish, publishState] = useMutation(PUBLISH_ASSIGNMENT, { refetchQueries: ['GradingAssignment'] });
  // null = showing the saved questions; a list = the teacher's unsaved edits
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const editor = data?.quizEditor;
  if (loading && !editor) {
    return (
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  const list: Draft[] =
    drafts ??
    (editor?.questions ?? []).map((q) => ({
      key: q.id,
      type: q.type,
      text: q.text,
      points: String(q.points),
      options: q.options,
      correctOption: q.correctOption ?? null,
      correctNumber: q.correctNumber == null ? '' : String(q.correctNumber),
      tolerance: q.tolerance ? String(q.tolerance) : '',
    }));
  const dirty = drafts !== null;
  const locked = !!editor?.locked;
  const total = list.reduce((sum, d) => sum + (isNumber(d.points) ? Number(d.points) : 0), 0);
  const firstProblem = list.map(problem).findIndex((p) => p !== null);
  const valid = list.length > 0 && firstProblem === -1;

  const edit = (next: Draft[]) => {
    setSaved(false);
    setDrafts(next);
  };
  const change = (key: string, patch: Partial<Draft>) => edit(list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const move = (index: number, by: number) => {
    const next = [...list];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    edit(next);
  };
  const remove = (key: string) => edit(list.filter((d) => d.key !== key));
  const add = (type: QuizQuestionType) => edit([...list, blank(type)]);

  const save = async () => {
    setError(null);
    try {
      await saveQuestions({
        variables: {
          input: {
            assignmentId,
            questions: list.map((d) => ({
              type: d.type,
              text: d.text.trim(),
              points: Number(d.points),
              options: d.type === 'MULTIPLE_CHOICE' ? d.options.map((o) => o.trim()) : undefined,
              correctOption: d.type === 'NUMBER' ? undefined : (d.correctOption ?? undefined),
              correctNumber: d.type === 'NUMBER' ? Number(d.correctNumber) : undefined,
              tolerance: d.type === 'NUMBER' && d.tolerance.trim() ? Number(d.tolerance) : undefined,
            })),
          },
        },
      });
      setDrafts(null);
      setSaved(true);
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  return (
    <Stack spacing={1.5}>
      {locked ? (
        <Alert severity="info" icon={<LockOutlinedIcon />}>
          {t('quiz.locked', { count: editor?.attempts ?? 0 })}
        </Alert>
      ) : (
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{t('quiz.editorHint')}</Typography>
      )}

      {list.map((d, index) => {
        const p = problem(d);
        return (
          <Card key={d.key} variant="outlined" sx={{ borderRadius: '12px', p: 2 }}>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mr: 'auto' }}>{t('quiz.question', { n: index + 1 })}</Typography>
              <TextField
                select
                size="small"
                value={d.type}
                disabled={locked}
                onChange={(e) => {
                  const type = e.target.value as QuizQuestionType;
                  change(d.key, { type, options: type === 'MULTIPLE_CHOICE' ? (d.options.length ? d.options : ['', '']) : [], correctOption: null });
                }}
                sx={{ minWidth: 180 }}
                slotProps={{ htmlInput: { 'aria-label': t('quiz.type') } }}
              >
                {TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {t(`quiz.types.${type}`)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                type="number"
                label={t('quiz.points')}
                value={d.points}
                disabled={locked}
                onChange={(e) => change(d.key, { points: e.target.value })}
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { min: 0.5, max: 100, step: 0.5 } }}
              />
              {!locked && (
                <Stack direction="row">
                  <Tooltip title={t('quiz.moveUp')}>
                    <span>
                      <IconButton size="small" disabled={index === 0} onClick={() => move(index, -1)} aria-label={t('quiz.moveUp')}>
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('quiz.moveDown')}>
                    <span>
                      <IconButton size="small" disabled={index === list.length - 1} onClick={() => move(index, 1)} aria-label={t('quiz.moveDown')}>
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('quiz.remove')}>
                    <IconButton size="small" onClick={() => remove(d.key)} aria-label={t('quiz.remove')}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </Stack>

            <TextField
              fullWidth
              multiline
              minRows={2}
              size="small"
              label={t('quiz.text')}
              value={d.text}
              disabled={locked}
              onChange={(e) => change(d.key, { text: e.target.value })}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />

            {d.type === 'MULTIPLE_CHOICE' && (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('quiz.markCorrect')}</Typography>
                {d.options.map((option, i) => (
                  <Stack key={i} direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                    <Radio
                      size="small"
                      checked={d.correctOption === i}
                      disabled={locked}
                      onChange={() => change(d.key, { correctOption: i })}
                      slotProps={{ input: { 'aria-label': t('quiz.correctAnswer', { n: i + 1 }) } }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={t('quiz.answer', { n: i + 1 })}
                      value={option}
                      disabled={locked}
                      onChange={(e) => change(d.key, { options: d.options.map((o, j) => (j === i ? e.target.value : o)) })}
                      slotProps={{ htmlInput: { maxLength: 300 } }}
                    />
                    {!locked && d.options.length > 2 && (
                      <IconButton
                        size="small"
                        aria-label={t('quiz.removeAnswer')}
                        onClick={() =>
                          change(d.key, {
                            options: d.options.filter((_, j) => j !== i),
                            correctOption: d.correctOption === i ? null : d.correctOption !== null && d.correctOption > i ? d.correctOption - 1 : d.correctOption,
                          })
                        }
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                ))}
                {!locked && d.options.length < MAX_OPTIONS && (
                  <Box>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => change(d.key, { options: [...d.options, ''] })}>
                      {t('quiz.addAnswer')}
                    </Button>
                  </Box>
                )}
              </Stack>
            )}

            {d.type === 'TRUE_FALSE' && (
              <RadioGroup
                row
                sx={{ mt: 1 }}
                value={d.correctOption === null ? '' : String(d.correctOption)}
                onChange={(e) => change(d.key, { correctOption: Number(e.target.value) })}
              >
                <FormControlLabel value="1" control={<Radio size="small" />} label={t('quiz.true')} disabled={locked} />
                <FormControlLabel value="0" control={<Radio size="small" />} label={t('quiz.false')} disabled={locked} />
              </RadioGroup>
            )}

            {d.type === 'NUMBER' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
                <TextField
                  size="small"
                  type="number"
                  label={t('quiz.correctNumber')}
                  value={d.correctNumber}
                  disabled={locked}
                  onChange={(e) => change(d.key, { correctNumber: e.target.value })}
                />
                <TextField
                  size="small"
                  type="number"
                  label={t('quiz.tolerance')}
                  helperText={t('quiz.toleranceHint')}
                  value={d.tolerance}
                  disabled={locked}
                  onChange={(e) => change(d.key, { tolerance: e.target.value })}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
              </Stack>
            )}

            {!locked && dirty && p && (
              <Typography sx={{ fontSize: '0.75rem', color: 'warning.dark', mt: 1 }}>{t(p)}</Typography>
            )}
          </Card>
        );
      })}

      {!locked && (
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {list.length < MAX_QUESTIONS &&
            TYPES.map((type) => (
              <Button key={type} size="small" variant="outlined" color="inherit" startIcon={<AddIcon />} onClick={() => add(type)} sx={{ borderColor: 'divider' }}>
                {t(`quiz.types.${type}`)}
              </Button>
            ))}
          <Typography sx={{ ml: 'auto', fontSize: '0.8125rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {t('quiz.total', { count: list.length, points: total })}
          </Typography>
          <Button variant="contained" disableElevation disabled={!valid || !dirty || saveState.loading} onClick={() => void save()}>
            {t('quiz.save')}
          </Button>
        </Stack>
      )}

      {error && <Alert severity="error">{error}</Alert>}
      {saved && !dirty && <Alert severity="success">{t('quiz.saved')}</Alert>}

      {!publishedAt && !dirty && (editor?.questions.length ?? 0) > 0 && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" disabled={publishState.loading} onClick={() => void publish({ variables: { input: { id: assignmentId, publish: true } } })}>
              {t('quiz.publish')}
            </Button>
          }
        >
          {t('quiz.draftNote')}
        </Alert>
      )}
    </Stack>
  );
}
