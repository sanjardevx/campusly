import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient, useLazyQuery, useMutation, useReactiveVar } from '@apollo/client/react';
import { Alert, Box, Button, ButtonBase, Card, Collapse, IconButton, LinearProgress, Link, Stack, TextField, Typography } from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useTranslation } from 'next-i18next/pages';
import { ADD_SUBMISSION_COMMENT, SUBMIT_ASSIGNMENT } from '@/apollo/student/mutation';
import { STUDENT_FILE_URL } from '@/apollo/student/query';
import { userVar } from '@/apollo/store';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { MarkdownText } from '@/libs/components/MarkdownText';
import { formatDueAt, formatInSchool, studentHref } from '@/libs/components/student/home/due';
import { STITCH, SoftPill, enter, pressSx } from '@/libs/components/student/home/parts';
import { fileType, formatSize } from '@/libs/components/teacher/course/model';
import type { StudentAssignmentQuery } from '@/libs/gql/graphql';
import { MIME_BY_EXTENSION, UPLOAD_LIMITS, kindOf, uploadSubmissionFile, type UploadPhase } from '@/libs/upload';
import { useDraft, type DraftFile } from './useDraft';

type Data = StudentAssignmentQuery;
type Submission = NonNullable<Data['mySubmission']>;

/** Server MAX_SUBMISSION_FILES */
const MAX_FILES = 10;

const cardSx = { borderRadius: '12px', borderColor: STITCH.outline, boxShadow: STITCH.rowShadow };

/** Status colours: the Stitch table's green / red / amber cells, always with words (never colour only) */
const TONE = {
  good: { bgcolor: '#E8F6ED', color: '#14532D' },
  bad: { bgcolor: '#FFDAD6', color: '#93000A' },
  warn: { bgcolor: '#FEF7EE', color: '#9A3412' },
  plain: { bgcolor: STITCH.surfaceContainer, color: STITCH.onSurfaceVariant },
};
function Badge({ tone, children }: { tone: keyof typeof TONE; children: ReactNode }) {
  return (
    <Box component="span" sx={{ ...TONE[tone], display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.25, borderRadius: 1, fontSize: '0.8125rem', fontWeight: 600 }}>
      {children}
    </Box>
  );
}

/** "2 days 4 hours" / "3 hours 12 mins" / "8 mins": the two biggest units */
function useSpan() {
  const { t } = useTranslation('student');
  return (ms: number) => {
    const mins = Math.max(1, Math.round(Math.abs(ms) / 60_000));
    const days = Math.floor(mins / 1440);
    const hours = Math.floor((mins % 1440) / 60);
    const rest = mins % 60;
    const parts = days ? [t('homework.days', { count: days }), hours && t('homework.hours', { count: hours })] : hours ? [t('homework.hours', { count: hours }), rest && t('homework.mins', { count: rest })] : [t('homework.mins', { count: rest })];
    return parts.filter(Boolean).join(' ');
  };
}

/**
 * Stitch "Homework 5" in its three states — not submitted, submitted, graded (DECISIONS §10).
 * The page always shows what the server says (mySubmission); the score and feedback arrive only
 * after the teacher publishes the grades.
 */
export function HomeworkView({ data, refetch }: { data: Data; refetch: () => Promise<unknown> }) {
  const { t } = useTranslation('student');
  const { locale } = useRouter();
  const span = useSpan();
  const user = useReactiveVar(userVar);
  const { assignment: a, mySubmission: sub, courseDetail: course } = data;
  const [editing, setEditing] = useState(false);

  const last = sub?.attempts.at(-1);
  const status = sub && sub.attempts.length ? sub.status : null;
  const published = !!a.gradesPublishedAt;
  // "Now" for the time-left line, taken once per visit (render stays pure)
  const [now] = useState(() => Date.now());
  const due = a.dueAt ? new Date(a.dueAt).getTime() : null;
  const pastDue = due !== null && now > due;
  const isExam = a.type === 'EXAM';
  // May the student hand in (again)? Server rules: not an exam, grades not published, late only if allowed
  const lateBlocked = pastDue && !a.allowLate;
  const canSubmitAgain = !!sub && sub.attempts.length > 0 && sub.attemptsLeft > 0;
  const firstTime = !status || status === 'DRAFT';
  const open = !isExam && !published && !lateBlocked && (firstTime || status === 'RETURNED' || (editing && canSubmitAgain));
  const week = course.modules.find((m) => m.id === a.moduleId);

  // Time remaining / early / late, like Moodle
  let remaining: ReactNode = '—';
  if (published) remaining = <Badge tone="plain">{t('homework.closed')}</Badge>;
  else if (due !== null && last) {
    const diff = due - new Date(last.submittedAt).getTime();
    remaining = diff >= 0 ? <Badge tone="good">{t('homework.early', { time: span(diff) })}</Badge> : <Badge tone="warn">{t('homework.late', { time: span(diff) })}</Badge>;
  } else if (due !== null) {
    remaining = due > now ? <Badge tone={due - now < 2 * 86_400_000 ? 'warn' : 'plain'}>{t('homework.left', { time: span(due - now) })}</Badge> : <Badge tone="bad">{t('homework.overdue', { time: span(now - due) })}</Badge>;
  }

  const submissionBadge = !status ? (
    <Badge tone="bad">{t('homework.state.none')}</Badge>
  ) : (
    <Badge tone={status === 'MISSING' ? 'bad' : status === 'LATE' || status === 'RETURNED' ? 'warn' : 'good'}>
      {(status === 'SUBMITTED' || status === 'GRADED') && <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}
      {t(`homework.state.${status}`)}
    </Badge>
  );
  const graded = published && (status === 'GRADED' || status === 'MISSING');
  const gradingBadge = isExam && !graded ? <Badge tone="plain">{t('homework.grading.exam')}</Badge> : graded ? <Badge tone="good">{t('homework.grading.graded')}</Badge> : <Badge tone="bad">{t('homework.grading.notGraded')}</Badge>;

  const limitBytes = Math.max(...a.acceptedFileTypes.map((ext) => UPLOAD_LIMITS[kindOf({ type: MIME_BY_EXTENSION[ext] } as File) ?? 'DOCUMENT'].maxBytes));
  const types = a.acceptedFileTypes.map((x) => x.toUpperCase()).join(', ');

  return (
    <Stack spacing={3} sx={{ maxWidth: 960 }}>
      {/* Breadcrumb + week */}
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1, pb: 1, borderBottom: 1, borderColor: STITCH.outlineSoft }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, fontSize: '0.84375rem', color: 'text.secondary', minWidth: 0 }}>
          <Link component={NextLink} href="/student/courses" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'inherit' }}>
            <MenuBookOutlinedIcon sx={{ fontSize: 18 }} />
          </Link>
          <Box component="span" sx={{ color: '#C0C8C4' }}>
            ›
          </Box>
          <Link component={NextLink} href={studentHref.course(course.id)} underline="hover" sx={{ color: 'inherit', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {course.title}
          </Link>
          <Box component="span" sx={{ color: '#C0C8C4' }}>
            ›
          </Box>
          <Typography noWrap sx={{ fontSize: 'inherit', fontWeight: 600, color: 'text.primary' }}>
            {a.title}
          </Typography>
        </Stack>
        {week && <SoftPill tone="neutral">{t('course.week', { week: week.order })}</SoftPill>}
      </Stack>

      {/* 1. The assignment */}
      <Card variant="outlined" sx={{ ...cardSx, p: { xs: 2, md: 3 }, ...enter(0) }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'secondary.main' }}>{t('homework.label')}</Typography>
        <Typography component="h1" sx={{ mt: 0.5, fontSize: { xs: '1.375rem', md: '1.5rem' }, lineHeight: 1.3, fontWeight: 600, letterSpacing: '-0.015em', color: STITCH.ink }}>
          {a.title}
        </Typography>
        {a.instructions?.trim() && <MarkdownText text={a.instructions} sx={{ mt: 2, fontSize: '0.9375rem', lineHeight: 1.7 }} />}
        {a.files.length > 0 && (
          <Stack direction="row" sx={{ mt: 2.5, gap: 1.5, flexWrap: 'wrap' }}>
            {a.files.map((f) => (
              <FileChip key={f.id} assetId={f.id} name={f.name} mimeType={f.mimeType} size={f.size} />
            ))}
          </Stack>
        )}
      </Card>

      {/* 2. Submission status (Moodle key–value table) */}
      <Card variant="outlined" sx={{ ...cardSx, overflow: 'hidden', ...enter(1) }}>
        <Stack direction="row" sx={{ px: { xs: 2, md: 3 }, py: 2, bgcolor: '#EFF5F0', borderBottom: 1, borderColor: STITCH.outlineSoft, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography component="h2" sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
            {t('homework.status.title')}
          </Typography>
          {last && <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>{t('homework.status.attempt', { n: last.number })}</Typography>}
        </Stack>
        <Box sx={{ '& > * + *': { borderTop: 1, borderColor: STITCH.outlineSoft } }}>
          <Row label={t('homework.status.submission')}>{submissionBadge}</Row>
          <Row label={t('homework.status.grading')}>{gradingBadge}</Row>
          <Row label={t('homework.status.due')}>{a.dueAt ? t('homework.schoolTime', { date: formatInSchool(a.dueAt, locale) }) : t('homework.noDue')}</Row>
          <Row label={t('homework.status.maxScore')}>{t('homework.points', { count: a.maxScore })}</Row>
          {!isExam && (
            <Row label={t('homework.status.accepted')}>
              {types} · {t('homework.upTo', { size: formatSize(limitBytes) })}
            </Row>
          )}
          <Row label={t('homework.status.remaining')}>{remaining}</Row>
          <Row label={t('homework.status.modified')}>{last ? formatDueAt(last.submittedAt, locale) : '—'}</Row>
          <Row label={t('homework.status.files')}>
            {last?.files.length ? (
              <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                {last.files.map((f) => (
                  <FileChip key={f.assetId} url={f.url} name={f.originalName} mimeType={f.mimeType} size={f.size} />
                ))}
              </Stack>
            ) : (
              '—'
            )}
            {last?.text && <MarkdownText text={last.text} sx={{ mt: last.files.length ? 1.5 : 0, fontSize: '0.875rem', color: 'text.secondary' }} />}
          </Row>
          <Row label={t('homework.status.comments')}>
            <Comments submission={sub} />
          </Row>
        </Box>
      </Card>

      {/* 3. Hand in (first time, after "Return for redo", or a new attempt) */}
      {open ? (
        <SubmitPanel
          key={user ? `${user.id}.${a.id}` : a.id}
          assignmentId={a.id}
          draftKey={user ? `campusly.homework.${user.id}.${a.id}` : null}
          accept={a.acceptedFileTypes.map((x) => MIME_BY_EXTENSION[x]).filter(Boolean)}
          hint={t('homework.upload.hint', { types, size: formatSize(limitBytes), max: MAX_FILES })}
          lateWarning={pastDue || (!!a.dueAt && !firstTime) ? t('homework.lateWarning', { date: formatDueAt(a.dueAt!, locale) }) : null}
          onCancel={editing ? () => setEditing(false) : undefined}
          onSubmitted={async () => {
            setEditing(false);
            await refetch();
          }}
        />
      ) : (
        !isExam &&
        !published && (
          <Stack spacing={1.5} sx={enter(2)}>
            {lateBlocked && !status ? (
              <Alert severity="error" icon={<WarningAmberRoundedIcon />}>
                {t('homework.noLate')}
              </Alert>
            ) : (
              canSubmitAgain && (
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button onClick={() => setEditing(true)} variant="outlined" startIcon={<EditNoteRoundedIcon />} sx={{ ...pressSx, borderColor: STITCH.outline, color: STITCH.ink }}>
                    {t('homework.edit')}
                  </Button>
                  <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{t('homework.attemptsLeft', { count: sub!.attemptsLeft })}</Typography>
                </Stack>
              )
            )}
            {canSubmitAgain && a.dueAt && (
              <Alert severity="warning" sx={{ bgcolor: '#FEF7EE', color: '#9A3412', '& .MuiAlert-icon': { color: '#B45309' } }}>
                {t('homework.lateWarning', { date: formatDueAt(a.dueAt, locale) })}
              </Alert>
            )}
          </Stack>
        )
      )}

      {/* 4. Feedback: only once the grades are published (the server sends nothing before) */}
      {graded && sub && (
        <Card variant="outlined" sx={{ ...cardSx, overflow: 'hidden', ...enter(3) }}>
          <Box sx={{ px: { xs: 2, md: 3 }, py: 2, bgcolor: '#EFF5F0', borderBottom: 1, borderColor: STITCH.outlineSoft }}>
            <Typography component="h2" sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
              {t('homework.feedback.title')}
            </Typography>
          </Box>
          <Box sx={{ '& > * + *': { borderTop: 1, borderColor: STITCH.outlineSoft } }}>
            <Row label={t('homework.feedback.grade')}>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: STITCH.ink, fontVariantNumeric: 'tabular-nums' }}>
                {sub.score ?? 0} / {a.maxScore}
              </Typography>
            </Row>
            {sub.gradedAt && <Row label={t('homework.feedback.gradedOn')}>{formatDueAt(sub.gradedAt, locale)}</Row>}
            {sub.gradedByName && <Row label={t('homework.feedback.gradedBy')}>{sub.gradedByName}</Row>}
            {sub.feedback?.trim() && (
              <Row label={t('homework.feedback.comments')}>
                <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: '#EFF5F0' }}>
                  <MarkdownText text={sub.feedback} sx={{ fontSize: '0.875rem', lineHeight: 1.6 }} />
                </Box>
              </Row>
            )}
          </Box>
          <Box sx={{ px: { xs: 2, md: 3 }, py: 1.5 }}>
            <Soon icon={<ForumOutlinedIcon />} label={t('homework.qa')} />
          </Box>
        </Card>
      )}
    </Stack>
  );
}

/** One key–value line of the Moodle-style table (stacked on phones) */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
      <Box sx={{ width: { sm: '30%' }, flexShrink: 0, px: { xs: 2, md: 3 }, pt: { xs: 1.5, sm: 1.5 }, pb: { xs: 0.5, sm: 1.5 }, bgcolor: { sm: 'rgba(239,245,240,0.5)' }, fontSize: '0.84375rem', fontWeight: 600, color: 'text.secondary' }}>
        {label}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, px: { xs: 2, md: 3 }, pt: { xs: 0, sm: 1.5 }, pb: 1.5, fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}>{children}</Box>
    </Box>
  );
}

/** A file to open: the teacher's (signed link made on click) or the student's own (link given) */
export function FileChip({ assetId, url, name, mimeType, size }: { assetId?: string; url?: string | null; name: string; mimeType: string; size: number }) {
  const { t } = useTranslation('student');
  const [getUrl, { loading }] = useLazyQuery(STUDENT_FILE_URL, { fetchPolicy: 'network-only' });
  const open = async () => {
    if (url) return window.open(url, '_blank', 'noopener');
    if (!assetId) return;
    const { data } = await getUrl({ variables: { assetId } });
    if (data) window.open(data.courseFileUrl.url, '_blank', 'noopener');
  };
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, pl: 1.5, pr: 0.75, py: 0.75, borderRadius: 2, border: 1, borderColor: STITCH.outline, bgcolor: '#EFF5F0', maxWidth: '100%' }}>
      <DescriptionOutlinedIcon sx={{ fontSize: 20, color: STITCH.ink }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: '0.84375rem', fontWeight: 600 }} title={name}>
          {name}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          {fileType(mimeType)} · {formatSize(size)}
        </Typography>
      </Box>
      <Button onClick={() => void open()} disabled={loading} size="small" startIcon={<DownloadRoundedIcon />} sx={{ ...pressSx, ml: 0.5, color: STITCH.ink, bgcolor: '#fff', '&:hover': { bgcolor: STITCH.surfaceContainer } }}>
        {t('homework.download')}
      </Button>
    </Stack>
  );
}

/** A disabled "coming soon" link (Study Tutor, Q&A wait for their phases) */
export function Soon({ icon, label }: { icon: ReactNode; label: string }) {
  const { t } = useTranslation('student');
  return (
    <Stack direction="row" aria-disabled sx={{ alignItems: 'center', gap: 1, color: 'text.disabled', '& svg': { fontSize: 18 } }}>
      {icon}
      <Typography sx={{ fontSize: '0.84375rem', fontWeight: 500 }}>{label}</Typography>
      <SoftPill tone="neutral">{t('homework.soon')}</SoftPill>
    </Stack>
  );
}

function Comments({ submission }: { submission: Submission | null | undefined }) {
  const { t } = useTranslation('student');
  const { locale } = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [add, { loading }] = useMutation(ADD_SUBMISSION_COMMENT);
  const comments = submission?.comments ?? [];

  return (
    <Box>
      <ButtonBase onClick={() => setOpen((o) => !o)} aria-expanded={open} sx={{ gap: 0.75, color: 'secondary.main', fontWeight: 600, fontSize: '0.84375rem', borderRadius: 1 }}>
        <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 16 }} />
        {t('homework.commentsCount', { count: comments.length })}
      </ButtonBase>
      <Collapse in={open}>
        <Stack spacing={1} sx={{ mt: 1.25 }}>
          {comments.map((c) => (
            <Box key={c.id} sx={{ p: 1.25, borderRadius: 2, bgcolor: '#EFF5F0', borderLeft: 3, borderColor: c.authorRole === 'STUDENT' ? 'secondary.main' : STITCH.ink }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                {c.authorName}{' '}
                <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                  · {formatDueAt(c.createdAt, locale)}
                </Box>
              </Typography>
              <Typography sx={{ fontSize: '0.84375rem', whiteSpace: 'pre-wrap' }}>{c.body}</Typography>
            </Box>
          ))}
          {/* A comment belongs to a submission: before handing in there is nothing to comment on */}
          {submission && (
            <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-start' }}>
              <TextField size="small" fullWidth multiline maxRows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('homework.commentPlaceholder')} slotProps={{ htmlInput: { maxLength: 2000 } }} />
              <Button
                variant="contained"
                disabled={loading || !body.trim()}
                onClick={() => void add({ variables: { input: { submissionId: submission.id, body: body.trim() } } }).then(() => setBody(''))}
                sx={{ ...pressSx, bgcolor: STITCH.ink, boxShadow: 'none', '&:hover': { bgcolor: 'primary.main', boxShadow: 'none' } }}
              >
                {t('homework.send')}
              </Button>
            </Stack>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}

interface Pending {
  key: number;
  name: string;
  phase: UploadPhase;
  percent: number;
  error?: string;
}

/** Upload area + optional text + Save draft / Submit (Stitch "Action area") */
function SubmitPanel({
  assignmentId,
  draftKey,
  accept,
  hint,
  lateWarning,
  onCancel,
  onSubmitted,
}: {
  assignmentId: string;
  draftKey: string | null;
  accept: string[];
  hint: string;
  lateWarning: string | null;
  onCancel?: () => void;
  onSubmitted: () => Promise<void>;
}) {
  const { t } = useTranslation('student');
  const errorText = useErrorText();
  const client = useApolloClient();
  const input = useRef<HTMLInputElement>(null);
  const counter = useRef(0);
  const { draft, update, save, clear } = useDraft(draftKey);
  const [pending, setPending] = useState<Pending[]>([]);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submit, { loading }] = useMutation(SUBMIT_ASSIGNMENT);
  const busy = pending.some((p) => !p.error);
  const room = MAX_FILES - draft.files.length - pending.filter((p) => !p.error).length;

  const start = async (list: File[]) => {
    setError(null);
    await Promise.all(
      list.slice(0, Math.max(0, room)).map(async (file) => {
        const key = ++counter.current;
        const patch = (p: Partial<Pending>) => setPending((all) => all.map((x) => (x.key === key ? { ...x, ...p } : x)));
        setPending((all) => [...all, { key, name: file.name, phase: 'PREPARING', percent: 0 }]);
        const kind = kindOf(file);
        // Same checks as the server, so a wrong file stops before any request
        if (!accept.includes(file.type) || (kind !== 'DOCUMENT' && kind !== 'IMAGE')) return patch({ phase: 'FAILED', error: t('homework.upload.FILE_TYPE') });
        if (file.size > UPLOAD_LIMITS[kind].maxBytes) return patch({ phase: 'FAILED', error: t('homework.upload.FILE_TOO_LARGE', { size: formatSize(UPLOAD_LIMITS[kind].maxBytes) }) });
        try {
          const id = await uploadSubmissionFile(client, assignmentId, file, (phase, percent) => patch({ phase, percent: percent ?? 0 }));
          const added: DraftFile = { id, name: file.name, size: file.size, mimeType: file.type };
          // Several files upload at once: add to the latest list, not the one this upload started with
          update((d) => ({ files: [...d.files, added] }), true);
          setPending((all) => all.filter((x) => x.key !== key));
        } catch (err) {
          patch({ phase: 'FAILED', error: err instanceof Error && err.message.startsWith('S3') ? t('homework.upload.s3') : errorText(errorCode(err)) });
        }
      }),
    );
  };

  const send = async () => {
    const text = draft.text.trim();
    if (!text && draft.files.length === 0) return setError(t('homework.empty'));
    setError(null);
    try {
      await submit({ variables: { input: { assignmentId, text: text || undefined, assetIds: draft.files.map((f) => f.id) } } });
      clear();
      await onSubmitted();
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void start(Array.from(e.dataTransfer.files));
  };
  const savedAt = draft.savedAt ? new Date(draft.savedAt) : null;

  return (
    <Card variant="outlined" sx={{ ...cardSx, p: { xs: 2, md: 3 }, ...enter(2) }}>
      <Stack spacing={3}>
        <Stack spacing={1.5}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <CloudUploadOutlinedIcon sx={{ fontSize: 20, color: STITCH.ink }} />
            <Typography component="h2" sx={{ fontWeight: 600 }}>
              {t('homework.upload.title')}
            </Typography>
          </Stack>
          {room > 0 && (
            <Box
              role="button"
              tabIndex={0}
              onClick={() => input.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={drop}
              sx={{
                border: '2px dashed',
                borderColor: over ? 'secondary.main' : 'rgba(192,200,196,0.6)',
                bgcolor: over ? '#E8EFEA' : 'rgba(239,245,240,0.4)',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'background-color 150ms ease, border-color 150ms ease',
                '&:hover': { borderColor: 'secondary.main', bgcolor: 'rgba(239,245,240,0.8)' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main' },
              }}
            >
              <Box sx={{ width: 40, height: 40, mx: 'auto', mb: 1, borderRadius: '50%', bgcolor: STITCH.surfaceContainer, color: STITCH.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CloudUploadOutlinedIcon />
              </Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {t('homework.upload.drop')}{' '}
                <Box component="span" sx={{ color: STITCH.ink, textDecoration: 'underline' }}>
                  {t('homework.upload.browse')}
                </Box>
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>{hint}</Typography>
              <input
                ref={input}
                type="file"
                hidden
                multiple
                accept={accept.join(',')}
                onChange={(e) => {
                  void start(Array.from(e.target.files ?? []));
                  e.target.value = '';
                }}
              />
            </Box>
          )}
          {draft.files.map((f) => (
            <Stack key={f.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#EFF5F0', border: 1, borderColor: STITCH.outline }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <DescriptionOutlinedIcon sx={{ color: STITCH.ink }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {f.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {formatSize(f.size)} · {t('homework.upload.READY')}
                  </Typography>
                </Box>
              </Stack>
              <IconButton size="small" aria-label={t('homework.upload.remove')} onClick={() => update((d) => ({ files: d.files.filter((x) => x.id !== f.id) }), true)}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          {pending.map((p) => (
            <Box key={p.key} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#EFF5F0', border: 1, borderColor: p.error ? '#FFDAD6' : STITCH.outline }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography noWrap sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {p.name}
                </Typography>
                {p.error ? (
                  <IconButton size="small" aria-label={t('homework.upload.remove')} onClick={() => setPending((all) => all.filter((x) => x.key !== p.key))}>
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                ) : (
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: STITCH.ink, fontVariantNumeric: 'tabular-nums' }}>{t(`homework.upload.${p.phase}`, { percent: p.percent })}</Typography>
                )}
              </Stack>
              {p.error ? (
                <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: 'error.main' }}>{p.error}</Typography>
              ) : (
                <LinearProgress
                  variant={p.phase === 'UPLOADING' ? 'determinate' : 'indeterminate'}
                  value={p.percent}
                  sx={{ mt: 1, height: 6, borderRadius: 999, bgcolor: STITCH.surfaceContainer, '& .MuiLinearProgress-bar': { bgcolor: STITCH.ink, borderRadius: 999 } }}
                />
              )}
            </Box>
          ))}
        </Stack>

        <Stack spacing={1}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Typography component="label" htmlFor="homework-text" sx={{ fontWeight: 600 }}>
              {t('homework.text.label')}
            </Typography>
            {savedAt && (
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, color: 'secondary.main' }} title={t('homework.draftHint')}>
                <CloudDoneOutlinedIcon sx={{ fontSize: 15 }} />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  {t('homework.draftSaved', { time: `${String(savedAt.getHours()).padStart(2, '0')}:${String(savedAt.getMinutes()).padStart(2, '0')}` })}
                </Typography>
              </Stack>
            )}
          </Stack>
          <TextField id="homework-text" multiline minRows={3} value={draft.text} onChange={(e) => update({ text: e.target.value })} placeholder={t('homework.text.placeholder')} slotProps={{ htmlInput: { maxLength: 10000 } }} />
        </Stack>

        {lateWarning && (
          <Alert severity="warning" sx={{ bgcolor: '#FEF7EE', color: '#9A3412', '& .MuiAlert-icon': { color: '#B45309' } }}>
            {lateWarning}
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} sx={{ pt: 2, borderTop: 1, borderColor: STITCH.outlineSoft, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
          <Soon icon={<SmartToyOutlinedIcon />} label={t('homework.tutor')} />
          <Stack direction="row" sx={{ gap: 1.5, justifyContent: 'flex-end' }}>
            {onCancel && (
              <Button onClick={onCancel} sx={{ ...pressSx, color: 'text.secondary' }}>
                {t('homework.cancelEdit')}
              </Button>
            )}
            <Button onClick={save} variant="outlined" sx={{ ...pressSx, borderColor: STITCH.outline, color: 'text.primary', bgcolor: '#EFF5F0' }}>
              {t('homework.saveDraft')}
            </Button>
            <Button
              onClick={() => void send()}
              disabled={busy || loading}
              variant="contained"
              startIcon={<CheckCircleRoundedIcon />}
              sx={{ ...pressSx, px: 3, bgcolor: STITCH.ink, boxShadow: 'none', '&:hover': { bgcolor: 'primary.main', boxShadow: 'none' } }}
            >
              {loading ? t('homework.submitting') : t('homework.submit')}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}
