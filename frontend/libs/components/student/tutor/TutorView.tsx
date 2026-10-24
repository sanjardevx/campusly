import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Button, ButtonBase, Card, IconButton, InputBase, LinearProgress, ListSubheader, MenuItem, Select, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import PolicyOutlinedIcon from '@mui/icons-material/PolicyOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { useTranslation } from 'next-i18next/pages';
import { STUDENT_TUTOR_TOPICS } from '@/apollo/student/query';
import { STITCH, SoftPill, pressSx } from '@/libs/components/student/home/parts';
import { HELP_LEVELS, useTutor, type Tutor, type TutorConversation, type TutorMessage, type TutorTopic } from './useTutor';

type Course = { id: string; title: string };

const time = (iso: string, locale = 'en') => new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });

/**
 * Stitch "AI Study Tutor" (DECISIONS §14, built ahead of the tutor phase): conversations on the left,
 * the chat with course / topic, the four help levels and the "hints only" rule in the middle, the
 * cited course materials and the daily limit on the right. Phones: the list or the chat, one at a time.
 * Everything goes through useTutor, which is a stub until the API exists.
 */
export function TutorView({ courses }: { courses: Course[] }) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('lg'));
  const phone = !useMediaQuery(theme.breakpoints.up('md'));
  const { query } = useRouter();
  const tutor = useTutor();
  const [courseId, setCourseId] = useState(typeof query.course === 'string' ? query.course : '');
  const [topicKey, setTopicKey] = useState('');
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
      onTopic={setTopicKey}
      onBack={phone ? () => setChatOpen(false) : undefined}
    />
  );

  if (phone) return chatOpen ? chat : list;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: desktop ? '280px minmax(0, 1fr) 280px' : '260px minmax(0, 1fr)',
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
      {desktop && (
        <Box sx={{ borderLeft: 1, borderColor: STITCH.outline, minHeight: 0, overflowY: 'auto' }}>
          <SidePanel tutor={tutor} course={course} />
        </Box>
      )}
    </Box>
  );
}

/** Left column: today's / this week's / older conversations and "New conversation" */
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
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
          <Typography component="h2" sx={{ fontWeight: 700 }}>
            {t('tutor.conversations')}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('tutor.items', { count: tutor.conversations.length })}</Typography>
        </Stack>
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
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center', p: 1.5, borderTop: 1, borderColor: STITCH.outline, color: 'text.secondary' }}>
        <PolicyOutlinedIcon sx={{ fontSize: 18 }} />
        <Typography sx={{ fontSize: '0.75rem' }}>{t('tutor.policyNote')}</Typography>
      </Stack>
    </Stack>
  );
}

/** Middle column: course + topic, help levels, messages, hint buttons and the composer */
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
  const assignments = data?.courseAssignments ?? [];
  const topicTitle =
    topicKey.startsWith('lesson:')
      ? (modules.flatMap((m) => m.lessons).find((l) => `lesson:${l.id}` === topicKey)?.title ?? null)
      : topicKey.startsWith('assignment:')
        ? (assignments.find((a) => `assignment:${a.id}` === topicKey)?.title ?? null)
        : null;

  // Follow new messages; an empty chat stays at the top (the banner and the welcome)
  useEffect(() => {
    if (tutor.messages.length) bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [tutor.messages.length]);

  const left = tutor.quota.limit - tutor.quota.used;
  const send = () => {
    const question = text.trim();
    if (!question || !course || left <= 0) return;
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
        <Stack direction="row" sx={{ display: { xs: 'none', xl: 'flex' }, alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
          <VerifiedUserOutlinedIcon sx={{ fontSize: 16 }} />
          <Typography sx={{ fontSize: '0.75rem' }}>{t('tutor.onlyCourse')}</Typography>
        </Stack>
      </Stack>

      <HelpLevels level={tutor.level} />

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 0, md: 3 }, py: 2 }}>
        {!tutor.connected && (
          <Alert severity="info" icon={<PsychologyOutlinedIcon />} sx={{ mb: 2 }}>
            {t('tutor.notConnectedBanner')}
          </Alert>
        )}
        {tutor.messages.length === 0 ? (
          <Welcome onPick={setText} />
        ) : (
          <Stack spacing={2}>
            {tutor.messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            {tutor.connected && (
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" color="inherit" startIcon={<LightbulbOutlinedIcon />} onClick={tutor.nextHint} disabled={tutor.level === 4} sx={{ ...pressSx, borderColor: STITCH.outline }}>
                  {t('tutor.anotherHint')}
                </Button>
                <Button size="small" variant="outlined" startIcon={<CheckCircleOutlineRoundedIcon />} onClick={tutor.solved} sx={pressSx}>
                  {t('tutor.solved')}
                </Button>
              </Stack>
            )}
          </Stack>
        )}
        <div ref={bottom} />
      </Box>

      {/* Composer */}
      <Box sx={{ p: { xs: 0, md: 2 }, pt: 1.5, borderTop: { md: 1 }, borderColor: { md: STITCH.outline } }}>
        <Stack direction="row" sx={{ alignItems: 'flex-end', gap: 1, p: 1, border: 1, borderColor: '#D1D5CB', borderRadius: 3, bgcolor: '#fff' }}>
          {/* Photos of written work come with the tutor phase */}
          <IconButton size="small" disabled aria-label={t('tutor.attach')}>
            <AttachFileRoundedIcon />
          </IconButton>
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
            sx={{ flex: 1, py: 0.75, fontSize: '0.9375rem' }}
            inputProps={{ maxLength: 2000, 'aria-label': t('tutor.placeholder') }}
          />
          <IconButton onClick={send} disabled={!text.trim() || !course || left <= 0} aria-label={t('tutor.send')} sx={{ bgcolor: 'primary.main', color: '#fff', borderRadius: 2, '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: STITCH.surfaceContainer } }}>
            <ArrowUpwardRoundedIcon />
          </IconButton>
        </Stack>
        <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', mt: 1, color: 'text.secondary' }}>
          <InfoOutlinedIcon sx={{ fontSize: 15 }} />
          <Typography sx={{ fontSize: '0.75rem' }}>{t('tutor.hintsOnly')}</Typography>
        </Stack>
      </Box>
    </Stack>
  );
}

/** "Help progression": the four levels, the current one highlighted (Stitch stepper) */
function HelpLevels({ level }: { level: number }) {
  const { t } = useTranslation('student');
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, px: { xs: 0, md: 2 }, py: 1.25, bgcolor: { md: '#F7FAF8' }, borderBottom: { md: 1 }, borderColor: { md: STITCH.outline }, overflowX: 'auto', scrollbarWidth: 'none' }}>
      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', whiteSpace: 'nowrap', mr: 0.5 }}>{t('tutor.help')}</Typography>
      {HELP_LEVELS.map((l) => {
        const done = l < level;
        const active = l === level;
        return (
          <Stack key={l} direction="row" sx={{ alignItems: 'center', gap: 0.5, px: 1, py: 0.25, borderRadius: 999, whiteSpace: 'nowrap', fontSize: '0.75rem', fontWeight: active ? 700 : 500, bgcolor: active ? 'primary.main' : done ? STITCH.surfaceContainer : 'transparent', color: active ? '#fff' : done ? 'primary.main' : 'text.secondary', border: 1, borderColor: active ? 'primary.main' : STITCH.outline }}>
            {done ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : <span>{l}</span>}
            {t(`tutor.level.${l}`)}
          </Stack>
        );
      })}
    </Stack>
  );
}

/** Empty chat: what the tutor does, and three ways to start */
function Welcome({ onPick }: { onPick: (text: string) => void }) {
  const { t } = useTranslation('student');
  const examples = ['start', 'stuck', 'check'] as const;
  return (
    <Stack sx={{ alignItems: 'center', textAlign: 'center', py: { xs: 2, md: 5 }, gap: 1.5 }}>
      <Box sx={{ width: 52, height: 52, borderRadius: '14px', display: 'grid', placeItems: 'center', bgcolor: STITCH.surfaceContainer, color: 'primary.main' }}>
        <PsychologyOutlinedIcon />
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>{t('tutor.welcome.title')}</Typography>
      <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', maxWidth: 420 }}>{t('tutor.welcome.body')}</Typography>
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

/** Right column: materials the tutor cited, "only this course's materials", today's limit */
function SidePanel({ tutor, course }: { tutor: Tutor; course: Course | undefined }) {
  const { t } = useTranslation('student');
  const left = tutor.quota.limit - tutor.quota.used;
  return (
    <Stack sx={{ p: 2, gap: 2, height: '100%' }}>
      <Box>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <AutoStoriesOutlinedIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography component="h2" sx={{ fontWeight: 700 }}>
            {t('tutor.sources.title')}
          </Typography>
        </Stack>
        <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>{t('tutor.sources.subtitle')}</Typography>
      </Box>
      {tutor.sources.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 3, p: 2, borderStyle: 'dashed', borderColor: STITCH.outline, fontSize: '0.8125rem', color: 'text.secondary' }}>
          {t('tutor.sources.none')}
        </Card>
      ) : (
        tutor.sources.map((s) => (
          <Card key={`${s.kind}-${s.title}`} variant="outlined" sx={{ borderRadius: 3, p: 1.5, borderColor: STITCH.outline }}>
            <SoftPill tone="mint">{t(`tutor.sources.kind.${s.kind}`)}</SoftPill>
            <Typography sx={{ mt: 1, fontWeight: 600, fontSize: '0.875rem' }}>{s.title}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{s.detail}</Typography>
          </Card>
        ))
      )}
      {course && (
        <Stack direction="row" sx={{ gap: 1, p: 1.5, borderRadius: 3, border: 1, borderColor: STITCH.outline, alignItems: 'flex-start' }}>
          <CheckCircleOutlineRoundedIcon sx={{ fontSize: 18, color: 'primary.main', mt: '1px' }} />
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{t('tutor.sources.onlyCourse', { course: course.title })}</Typography>
        </Stack>
      )}
      <Box sx={{ flex: 1 }} />
      <Card variant="outlined" sx={{ borderRadius: 3, p: 1.5, borderColor: STITCH.outline }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>{t('tutor.quota.title')}</Typography>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {tutor.quota.used} / {tutor.quota.limit}
          </Typography>
        </Stack>
        <Typography sx={{ mt: 0.5, fontWeight: 700, fontSize: '1.125rem' }}>{t('tutor.quota.left', { count: left })}</Typography>
        <LinearProgress variant="determinate" value={(tutor.quota.used / tutor.quota.limit) * 100} sx={{ mt: 1, height: 6, borderRadius: 999, bgcolor: STITCH.surfaceContainer }} />
        <Typography sx={{ mt: 1, fontSize: '0.75rem', color: 'text.secondary' }}>{t('tutor.quota.resets')}</Typography>
      </Card>
    </Stack>
  );
}

