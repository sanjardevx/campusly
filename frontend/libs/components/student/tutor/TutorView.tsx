import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Button, ButtonBase, IconButton, InputBase, ListSubheader, MenuItem, Select, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import { useTranslation } from 'next-i18next/pages';
import { STUDENT_TUTOR_TOPICS } from '@/apollo/student/query';
import { useErrorText } from '@/libs/i18n';
import { STITCH, SoftPill, pressSx } from '@/libs/components/student/home/parts';
import { KindIcon } from '@/libs/components/KindIcon';
import { HELP_LEVELS, useTutor, type Tutor, type TutorConversation, type TutorMessage, type TutorTopic } from './useTutor';

type Course = { id: string; title: string };

const time = (iso: string, locale = 'en') => new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });

/**
 * AI Study Tutor (DECISIONS §14; Stitch's screen made quieter on purpose): conversations on the left,
 * the chat on the right. What the tutor is says the page title once; the help level and the cited
 * materials appear only once there is an answer, and one line under the box has the daily limit.
 * Phones: the list or the chat, one at a time.
 * Everything goes through useTutor (GraphQL for the lists, POST /tutor/chat for the streamed answer).
 * `?course=` and `?topic=lesson:<id>` open it from a lesson or homework page.
 */
export function TutorView({ courses }: { courses: Course[] }) {
  const theme = useTheme();
  const phone = !useMediaQuery(theme.breakpoints.up('md'));
  const { query } = useRouter();
  const tutor = useTutor();
  const [courseId, setCourseId] = useState(typeof query.course === 'string' ? query.course : '');
  const [topicKey, setTopicKey] = useState(typeof query.topic === 'string' ? query.topic : '');
  // Phones show one panel: the list until a conversation is open (or a new one started)
  const [chatOpen, setChatOpen] = useState(false);

  // Nothing chosen yet (or ?course= is not one of theirs): the first course
  const course = courses.find((c) => c.id === courseId) ?? courses[0];

  const start = () => {
    tutor.select(null);
    setTopicKey('');
    setChatOpen(true);
  };
  const open = (c: TutorConversation) => {
    tutor.select(c.id);
    setCourseId(c.courseId);
    setTopicKey(c.lessonId ? `lesson:${c.lessonId}` : c.assignmentId ? `assignment:${c.assignmentId}` : '');
    setChatOpen(true);
  };

  const list = <ConversationList tutor={tutor} onNew={start} onOpen={open} />;
  const chat = (
    <ChatPanel
      tutor={tutor}
      courses={courses}
      course={course}
      onCourse={(id) => {
        setCourseId(id);
        setTopicKey('');
        tutor.select(null);
      }}
      topicKey={topicKey}
      onTopic={(key) => {
        // A conversation keeps its topic: another topic is a new conversation
        setTopicKey(key);
        if (tutor.activeId) tutor.select(null);
      }}
      onBack={phone ? () => setChatOpen(false) : undefined}
    />
  );

  if (phone) return chatOpen ? chat : list;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '260px minmax(0, 1fr)',
        border: 1,
        borderColor: STITCH.outline,
        borderRadius: '16px',
        bgcolor: '#fff',
        overflow: 'hidden',
        // The chat fills the screen under the top bar and the page title, and scrolls inside itself
        height: 'calc(100vh - 220px)',
        minHeight: 560,
      }}
    >
      <Box sx={{ borderRight: 1, borderColor: STITCH.outline, minHeight: 0 }}>{list}</Box>
      <Box sx={{ minHeight: 0, minWidth: 0 }}>{chat}</Box>
    </Box>
  );
}

/** Left column: "New conversation" and today's / earlier conversations */
function ConversationList({ tutor, onNew, onOpen }: { tutor: Tutor; onNew: () => void; onOpen: (c: TutorConversation) => void }) {
  const { t } = useTranslation('student');
  const { locale } = useRouter();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const groups = [
    { key: 'today', items: tutor.conversations.filter((c) => new Date(c.updatedAt).getTime() >= startOfToday) },
    { key: 'earlier', items: tutor.conversations.filter((c) => new Date(c.updatedAt).getTime() < startOfToday) },
  ].filter((g) => g.items.length);

  return (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ p: 2, pb: 1.5 }}>
        <Button fullWidth variant="outlined" color="inherit" startIcon={<AddRoundedIcon />} onClick={onNew} sx={{ ...pressSx, borderColor: STITCH.outline, fontWeight: 600 }}>
          {t('tutor.new')}
        </Button>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5 }}>
        {groups.length === 0 ? (
          <Typography sx={{ px: 0.5, py: 2, fontSize: '0.8125rem', color: 'text.secondary' }}>{t('tutor.noConversations')}</Typography>
        ) : (
          groups.map((g) => (
            <Box key={g.key} sx={{ mb: 1.5 }}>
              <Typography sx={{ px: 0.5, py: 1, fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>{t(`tutor.group.${g.key}`)}</Typography>
              {g.items.map((c) => {
                const active = c.id === tutor.activeId;
                return (
                  <ButtonBase
                    key={c.id}
                    onClick={() => onOpen(c)}
                    sx={{ width: '100%', display: 'block', textAlign: 'left', p: 1.25, mb: 0.5, borderRadius: 2, bgcolor: active ? STITCH.surfaceContainer : 'transparent', borderLeft: 3, borderColor: active ? 'primary.main' : 'transparent', '&:hover': { bgcolor: active ? STITCH.surfaceContainer : '#F7FAF8' } }}
                  >
                    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                      <SoftPill tone="neutral">{c.courseTitle}</SoftPill>
                      <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', flexShrink: 0 }}>{time(c.updatedAt, locale)}</Typography>
                    </Stack>
                    <Typography noWrap sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {c.title}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {c.preview}
                    </Typography>
                  </ButtonBase>
                );
              })}
            </Box>
          ))
        )}
      </Box>
    </Stack>
  );
}

/** The chat: course + topic, messages, hint buttons and the composer */
function ChatPanel({
  tutor,
  courses,
  course,
  onCourse,
  topicKey,
  onTopic,
  onBack,
}: {
  tutor: Tutor;
  courses: Course[];
  course: Course | undefined;
  onCourse: (id: string) => void;
  topicKey: string;
  onTopic: (key: string) => void;
  onBack?: () => void;
}) {
  const { t } = useTranslation('student');
  const [text, setText] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const { data } = useQuery(STUDENT_TUTOR_TOPICS, { variables: { courseId: course?.id ?? '' }, skip: !course });

  // Topics: the course's lessons by week, then its assignments
  const modules = [...(data?.courseDetail.modules ?? [])].sort((a, b) => a.order - b.order);
  // Quizzes and assignments the teacher closed to the tutor are not offered (the server refuses them too)
  const assignments = (data?.courseAssignments ?? []).filter((a) => a.type !== 'QUIZ' && a.tutorMode !== 'OFF');
  const topicTitle =
    topicKey.startsWith('lesson:')
      ? (modules.flatMap((m) => m.lessons).find((l) => `lesson:${l.id}` === topicKey)?.title ?? null)
      : topicKey.startsWith('assignment:')
        ? (assignments.find((a) => `assignment:${a.id}` === topicKey)?.title ?? null)
        : null;

  // Follow new messages; an empty chat stays at the top (the banner and the welcome)
  const lastText = tutor.messages.at(-1)?.text.length ?? 0;
  useEffect(() => {
    if (tutor.messages.length) bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [tutor.messages.length, lastText, tutor.error]);

  const errorText = useErrorText();
  const left = tutor.quota.limit - tutor.quota.used;
  const blocked = !tutor.connected || tutor.quizActive || tutor.streaming || left <= 0;
  const lastRole = tutor.messages.at(-1)?.role;
  const send = () => {
    const question = text.trim();
    if (!question || !course || blocked) return;
    const topic: TutorTopic = { courseId: course.id, courseTitle: course.title, topicKey, topicTitle };
    tutor.send(question, topic);
    setText('');
  };

  return (
    <Stack sx={{ height: '100%', minHeight: { xs: 'calc(100vh - 260px)', md: 0 } }}>
      {/* Course + topic */}
      <Stack direction="row" sx={{ gap: 1, p: { xs: 0, md: 1.5 }, pb: 1.5, alignItems: 'center', flexWrap: 'wrap', borderBottom: { md: 1 }, borderColor: { md: STITCH.outline } }}>
        {onBack && (
          <IconButton onClick={onBack} aria-label={t('tutor.back')} size="small">
            <ArrowBackRoundedIcon />
          </IconButton>
        )}
        <Select size="small" value={course?.id ?? ''} onChange={(e) => onCourse(e.target.value)} displayEmpty sx={{ minWidth: 150, flex: { xs: 1, md: 'none' }, fontSize: '0.875rem' }} inputProps={{ 'aria-label': t('tutor.course') }} renderValue={(v) => courses.find((c) => c.id === v)?.title ?? t('tutor.course')}>
          {courses.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.title}
            </MenuItem>
          ))}
        </Select>
        <Select size="small" value={topicKey} onChange={(e) => onTopic(e.target.value)} displayEmpty sx={{ minWidth: 180, flex: 1, fontSize: '0.875rem' }} inputProps={{ 'aria-label': t('tutor.topic') }} renderValue={(v) => (v ? (topicTitle ?? '…') : t('tutor.anyTopic'))}>
          <MenuItem value="">{t('tutor.anyTopic')}</MenuItem>
          {modules.map((m) => [
            <ListSubheader key={m.id}>{m.title}</ListSubheader>,
            ...m.lessons.map((l) => (
              <MenuItem key={l.id} value={`lesson:${l.id}`}>
                {l.title}
              </MenuItem>
            )),
          ])}
          {assignments.length > 0 && <ListSubheader>{t('tutor.assignments')}</ListSubheader>}
          {assignments.map((a) => (
            <MenuItem key={a.id} value={`assignment:${a.id}`}>
              {a.title}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 0, md: 3 }, py: 2, display: 'flex', flexDirection: 'column' }}>
        {!tutor.connected && (
          <Alert severity="info" icon={<PsychologyOutlinedIcon />} sx={{ mb: 2 }}>
            {t('tutor.notConnectedBanner')}
          </Alert>
        )}
        {tutor.connected && tutor.quizActive && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('tutor.quizActiveBanner')}
          </Alert>
        )}
        {tutor.messages.length === 0 ? (
          <Welcome onPick={setText} />
        ) : (
          <Stack spacing={2}>
            {tutor.messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            {tutor.streaming && lastRole !== 'TUTOR' && <Thinking />}
            {tutor.connected && !tutor.streaming && lastRole === 'TUTOR' && (
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button size="small" variant="outlined" color="inherit" startIcon={<LightbulbOutlinedIcon />} onClick={tutor.nextHint} disabled={tutor.level === 4 || blocked} sx={{ ...pressSx, borderColor: STITCH.outline }}>
                  {t('tutor.anotherHint')}
                </Button>
                <Button size="small" variant="outlined" startIcon={<CheckCircleOutlineRoundedIcon />} onClick={tutor.solved} sx={pressSx}>
                  {t('tutor.solved')}
                </Button>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                  {tutor.level}/{HELP_LEVELS.length} · {t(`tutor.level.${tutor.level}`)}
                </Typography>
              </Stack>
            )}
            {tutor.sources.length > 0 && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {t('tutor.sources.title')}: {tutor.sources.map((s) => (s.page ? `${s.title} (${t('tutor.sources.page', { page: s.page })})` : s.title)).join(', ')}
              </Typography>
            )}
          </Stack>
        )}
        {tutor.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorText(tutor.error)}
          </Alert>
        )}
        <div ref={bottom} />
      </Box>

      {/* Composer */}
      <Box sx={{ p: { xs: 0, md: 2 }, pt: 1.5, borderTop: { md: 1 }, borderColor: { md: STITCH.outline } }}>
        <Stack direction="row" sx={{ alignItems: 'flex-end', gap: 1, p: 1, border: 1, borderColor: '#D1D5CB', borderRadius: 3, bgcolor: '#fff' }}>
          <InputBase
            multiline
            maxRows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t('tutor.placeholder')}
            sx={{ flex: 1, py: 0.75, pl: 1, fontSize: '0.9375rem' }}
            inputProps={{ maxLength: 2000, 'aria-label': t('tutor.placeholder') }}
          />
          <IconButton onClick={send} disabled={!text.trim() || !course || blocked} aria-label={t('tutor.send')} sx={{ bgcolor: 'primary.main', color: '#fff', borderRadius: 2, '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: STITCH.surfaceContainer } }}>
            <ArrowUpwardRoundedIcon />
          </IconButton>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, mt: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
          <span>{t('tutor.hintsOnly')}</span>
          <Box component="span" sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            {t('tutor.quota.left', { count: left })}
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
}

/** Empty chat: three ways to start */
function Welcome({ onPick }: { onPick: (text: string) => void }) {
  const { t } = useTranslation('student');
  const examples = ['start', 'stuck', 'check'] as const;
  return (
    <Stack sx={{ alignItems: 'center', textAlign: 'center', my: 'auto', py: 2, gap: 1.5 }}>
      <KindIcon kind="tutor" size={44} />
      <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>{t('tutor.welcome.title')}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1, mt: 1 }}>
        {examples.map((k) => (
          <Button key={k} size="small" variant="outlined" color="inherit" onClick={() => onPick(t(`tutor.welcome.${k}`))} sx={{ ...pressSx, borderColor: STITCH.outline, textTransform: 'none' }}>
            {t(`tutor.welcome.${k}`)}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}

/** The tutor is reading the materials: three dots until the first words arrive */
function Thinking() {
  const { t } = useTranslation('student');
  return (
    <Stack sx={{ alignItems: 'flex-start' }}>
      <Box role="status" aria-label={t('tutor.thinking')} sx={{ px: 2, py: 1.25, borderRadius: 3, borderBottomLeftRadius: 6, bgcolor: '#fff', border: 1, borderColor: STITCH.outline, display: 'flex', gap: 0.5 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              animation: 'tutorDot 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
              '@keyframes tutorDot': { '0%, 80%, 100%': { opacity: 0.25 }, '40%': { opacity: 1 } },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.6 },
            }}
          />
        ))}
      </Box>
    </Stack>
  );
}

function Message({ message }: { message: TutorMessage }) {
  const { t } = useTranslation('student');
  const { locale } = useRouter();
  if (message.role === 'SYSTEM') {
    return (
      <Box sx={{ alignSelf: 'center', px: 1.5, py: 0.5, borderRadius: 999, border: 1, borderColor: STITCH.outline, bgcolor: '#fff', fontSize: '0.75rem', color: 'text.secondary', textAlign: 'center' }}>
        {t(`tutor.system.${message.text}`)}
      </Box>
    );
  }
  const mine = message.role === 'STUDENT';
  return (
    <Stack sx={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>
        {mine ? t('tutor.you') : t('tutor.name')} · {time(message.createdAt, locale)}
      </Typography>
      <Box sx={{ maxWidth: '85%', px: 2, py: 1.25, borderRadius: 3, whiteSpace: 'pre-wrap', fontSize: '0.9375rem', ...(mine ? { bgcolor: 'primary.main', color: '#fff', borderBottomRightRadius: 6 } : { bgcolor: '#fff', border: 1, borderColor: STITCH.outline, borderBottomLeftRadius: 6 }) }}>
        {message.text}
      </Box>
    </Stack>
  );
}
