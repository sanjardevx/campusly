import { useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client/react';
import type { ApolloCache } from '@apollo/client';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from 'next-i18next/pages';
import { ANSWER_QUESTION, HIDE_ANSWER, HIDE_QUESTION, SET_QUESTION_PINNED, SET_QUESTION_RESOLVED } from '@/apollo/qa/mutation';
import { COURSE_QUESTION } from '@/apollo/qa/query';
import { errorCode } from '@/libs/errors';
import type { ThreadFieldsFragment } from '@/libs/gql/graphql';
import { formatDateTime } from '@/libs/i18n/format';
import { useErrorText } from '@/libs/i18n';
import { tokens } from '@/libs/theme';
import { Tag, useAboutLabel } from './QuestionList';

type Thread = ThreadFieldsFragment;

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * Stitch "Teacher Q&A: Problem 7": the question, its replies (oldest first; teachers' replies are
 * highlighted) and the reply box. Staff also pin it as FAQ, resolve it and hide a question or a
 * reply. Every mutation answers with the whole thread, written straight into the cache.
 */
export function ThreadView({ thread, backHref }: { thread: Thread; backHref: string }) {
  const { t } = useTranslation('qa');
  const { locale, push } = useRouter();
  const errorText = useErrorText();
  const about = useAboutLabel()(thread.question);
  const q = thread.question;
  const staff = thread.canModerate;
  const [body, setBody] = useState('');
  const [resolveAfter, setResolveAfter] = useState(true);
  const [confirm, setConfirm] = useState<{ kind: 'question' } | { kind: 'answer'; id: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // The thread has no id of its own: put the mutation's thread where courseQuestion(id) reads it
  const write = (cache: ApolloCache, next: Thread | undefined) => {
    if (next) cache.writeQuery({ query: COURSE_QUESTION, variables: { id: q.id }, data: { courseQuestion: next } });
  };
  const [answer, answerState] = useMutation(ANSWER_QUESTION, { update: (cache, { data }) => write(cache, data?.answerQuestion) });
  const [resolve, resolveState] = useMutation(SET_QUESTION_RESOLVED, { update: (cache, { data }) => write(cache, data?.setQuestionResolved) });
  const [pin, pinState] = useMutation(SET_QUESTION_PINNED, { update: (cache, { data }) => write(cache, data?.setQuestionPinned) });
  const [hideAnswer, hideAnswerState] = useMutation(HIDE_ANSWER, { update: (cache, { data }) => write(cache, data?.hideAnswer) });
  const [hideQuestion, hideQuestionState] = useMutation(HIDE_QUESTION, { refetchQueries: ['CourseQuestions'] });
  const busy = resolveState.loading || pinState.loading;

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      return true;
    } catch (err) {
      setToast(errorText(errorCode(err)));
      return false;
    }
  };

  const post = async () => {
    const ok = await run(() => answer({ variables: { input: { questionId: q.id, body: body.trim(), resolve: staff && resolveAfter } } }));
    if (ok) setBody('');
  };

  const onConfirm = async () => {
    if (!confirm) return;
    if (confirm.kind === 'question') {
      if (await run(() => hideQuestion({ variables: { id: q.id } }))) void push(backHref);
    } else {
      await run(() => hideAnswer({ variables: { id: confirm.id } }));
    }
    setConfirm(null);
  };

  const status = q.isResolved ? t('status.resolved') : q.isAnswered ? t('status.answered') : staff ? t('status.unanswered') : t('status.waiting');

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 900, mx: 'auto', width: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5 }}>
        <Link component={NextLink} href={backHref} underline="none" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: '0.875rem', fontWeight: 600, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
          <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
          {t('thread.back')}
        </Link>
        {staff && thread.canReply && (
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            <Tooltip title={q.isPrivate ? t('thread.pinPrivate') : ''}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<PushPinOutlinedIcon />}
                  disabled={busy || q.isPrivate}
                  onClick={() => void run(() => pin({ variables: { id: q.id, pinned: !q.isPinned } }))}
                  sx={{ borderColor: 'divider', bgcolor: 'background.paper' }}
                >
                  {q.isPinned ? t('thread.unpin') : t('thread.pin')}
                </Button>
              </span>
            </Tooltip>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<TaskAltRoundedIcon />}
              disabled={busy}
              onClick={() => void run(() => resolve({ variables: { id: q.id, resolved: !q.isResolved } }))}
              sx={{ borderColor: 'divider', bgcolor: 'background.paper' }}
            >
              {q.isResolved ? t('thread.reopen') : t('thread.resolve')}
            </Button>
            <Button size="small" color="error" startIcon={<VisibilityOffOutlinedIcon />} onClick={() => setConfirm({ kind: 'question' })}>
              {t('thread.hide')}
            </Button>
          </Stack>
        )}
      </Stack>

      {/* The question */}
      <Card variant="outlined" sx={{ borderRadius: '12px', p: { xs: 2, md: 3 } }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start' }}>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center', minWidth: 0 }}>
            <Tag tone="course">{q.courseTitle}</Tag>
            {about && <Tag tone="about">{about}</Tag>}
            {q.isPinned && <Tag tone="faq">{t('faqTag')}</Tag>}
            <Tag tone={q.isAnswered ? 'answered' : 'waiting'}>{status}</Tag>
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, color: q.isPrivate ? 'error.main' : 'text.disabled', flexShrink: 0, '& svg': { fontSize: 16 } }}>
            {q.isPrivate ? <LockOutlinedIcon /> : <VisibilityOutlinedIcon />}
            <Typography sx={{ fontSize: '0.75rem', display: { xs: 'none', sm: 'block' } }}>{q.isPrivate ? t('thread.private') : t('thread.visible')}</Typography>
          </Stack>
        </Stack>
        <Typography component="h1" sx={{ mt: 1.5, fontSize: { xs: '1.25rem', md: '1.5rem' }, fontWeight: 700, letterSpacing: '-0.01em' }}>
          {q.title}
        </Typography>
        <Person name={q.isMine ? t('you') : q.authorName} avatar={q.authorName} extra={[q.authorLoginId && t('thread.id', { id: q.authorLoginId }), formatDateTime(q.createdAt, locale)]} />
        {q.body && (
          <Typography sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: tokens.divider, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.7 }}>
            {q.body}
          </Typography>
        )}
      </Card>

      {/* Replies */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', px: 0.5 }}>
        <Typography component="h2" sx={{ fontWeight: 700 }}>
          {thread.answers.length ? t('replies', { count: thread.answers.length }) : t('thread.noReplies')}
        </Typography>
        {thread.answers.length > 1 && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('thread.sorted')}</Typography>}
      </Stack>
      {thread.answers.map((a) => (
        <Card
          key={a.id}
          variant="outlined"
          sx={{ borderRadius: '12px', p: { xs: 2, md: 2.5 }, ...(a.isStaff && { bgcolor: tokens.successTint, borderColor: '#CFE3D6' }) }}
        >
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Person
              name={a.isMine ? t('you') : a.authorName}
              avatar={a.authorName}
              badge={
                a.isStaff ? (
                  <Tag tone="answered" icon={<ShieldOutlinedIcon />}>
                    {t('thread.instructor')}
                  </Tag>
                ) : (
                  <Tag tone="about">{t('thread.classmate')}</Tag>
                )
              }
              extra={[formatDateTime(a.createdAt, locale)]}
              dense
            />
            {staff && thread.canReply && (
              <Button size="small" color="inherit" onClick={() => setConfirm({ kind: 'answer', id: a.id })} sx={{ color: 'text.secondary', flexShrink: 0 }}>
                {t('thread.hideReply')}
              </Button>
            )}
          </Stack>
          <Typography sx={{ mt: 1.25, pl: { sm: 5 }, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.7 }}>{a.body}</Typography>
        </Card>
      ))}

      {/* Reply box */}
      {thread.canReply ? (
        <Card variant="outlined" sx={{ borderRadius: '12px', p: { xs: 2, md: 2.5 } }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <Typography component="h2" sx={{ fontWeight: 700 }}>
                {staff ? t('thread.yourAnswer') : t('thread.yourReply')}
              </Typography>
              {staff && (
                <Tag tone="answered" icon={<ShieldOutlinedIcon />}>
                  {t('thread.instructor')}
                </Tag>
              )}
            </Stack>
            {staff && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('thread.highlighted')}</Typography>}
          </Stack>
          <TextField
            multiline
            minRows={4}
            fullWidth
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={staff ? t('thread.placeholderStaff') : t('thread.placeholder')}
            slotProps={{ htmlInput: { maxLength: 5000, 'aria-label': staff ? t('thread.yourAnswer') : t('thread.yourReply') } }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ mt: 1.5, gap: 1.5, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
            {staff && !q.isResolved ? (
              <FormControlLabel
                control={<Checkbox size="small" checked={resolveAfter} onChange={(e) => setResolveAfter(e.target.checked)} />}
                label={<Typography sx={{ fontSize: '0.875rem' }}>{t('thread.resolveAfter')}</Typography>}
              />
            ) : (
              <span />
            )}
            <Button
              variant="contained"
              disableElevation
              startIcon={answerState.loading ? <CircularProgress size={16} color="inherit" /> : <SendRoundedIcon />}
              disabled={!body.trim() || answerState.loading}
              onClick={() => void post()}
            >
              {staff ? t('thread.postAnswer') : t('thread.postReply')}
            </Button>
          </Stack>
        </Card>
      ) : (
        <Alert severity="info">{t('thread.archived')}</Alert>
      )}

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirm?.kind === 'question' ? t('thread.hide') : t('thread.hideReplyTitle')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{confirm?.kind === 'question' ? t('thread.hideConfirm') : t('thread.hideReplyConfirm')}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setConfirm(null)}>
            {t('drawer.cancel')}
          </Button>
          <Button color="error" variant="contained" disableElevation disabled={hideQuestionState.loading || hideAnswerState.loading} onClick={() => void onConfirm()}>
            {t('thread.hideButton')}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity="error" onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

/** Avatar initials (of the real name, also for "You"), name, a badge and a muted meta line ("ID 26100042 · Oct 16, 19:40") */
function Person({ name, avatar, badge, extra, dense }: { name: string; avatar: string; badge?: ReactNode; extra: (string | null | false)[]; dense?: boolean }) {
  return (
    <Stack direction="row" sx={{ mt: dense ? 0 : 1.25, alignItems: 'center', gap: 1.25, flexWrap: 'wrap', minWidth: 0 }}>
      <Avatar sx={{ width: 30, height: 30, fontSize: '0.75rem', fontWeight: 600, bgcolor: tokens.primaryTint, color: 'primary.main' }}>{initials(avatar)}</Avatar>
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{name}</Typography>
      {badge}
      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{extra.filter(Boolean).join(' · ')}</Typography>
    </Stack>
  );
}
