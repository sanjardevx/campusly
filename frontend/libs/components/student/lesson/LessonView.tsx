import { useEffect, useRef, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { Box, Button, Card, CircularProgress, Link, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import TimelapseRoundedIcon from '@mui/icons-material/TimelapseRounded';
import { useTranslation } from 'next-i18next/pages';
import { COMPLETE_LESSON } from '@/apollo/student/mutation';
import { LESSON_VIDEO, STUDENT_FILE_URL } from '@/apollo/student/query';
import { MarkdownText } from '@/libs/components/MarkdownText';
import { studentHref } from '@/libs/components/student/home/due';
import { STITCH, SoftPill, enter, pressSx } from '@/libs/components/student/home/parts';
import { fileType, formatSize } from '@/libs/components/teacher/course/model';
import type { StudentLessonQuery } from '@/libs/gql/graphql';
import { VideoPlayer, clock } from './VideoPlayer';

type Data = StudentLessonQuery;
type Lesson = Data['courseDetail']['modules'][number]['lessons'][number];

const cardSx = { borderRadius: '12px', borderColor: STITCH.outline, boxShadow: STITCH.rowShadow, p: { xs: 2, md: 3 } };

/**
 * Stitch "Lesson: Quadratic Equations (Compact View)": the lesson in the main column, the Study
 * Tutor as a coming-soon card beside it (DECISIONS §10). A phone gets the same blocks stacked.
 */
export function LessonView({ data, lessonId, desktop, refetch }: { data: Data; lessonId: string; desktop: boolean; refetch: () => void }) {
  const { t } = useTranslation('student');
  const course = data.courseDetail;
  const weeks = [...course.modules].sort((a, b) => a.order - b.order);
  // The course in reading order: weeks, then lessons inside them (prev / next follow it)
  const ordered = weeks.flatMap((w) => [...w.lessons].sort((a, b) => a.order - b.order).map((lesson) => ({ lesson, week: w })));
  const at = ordered.findIndex((x) => x.lesson.id === lessonId);
  const owner = course.teachers.find((x) => x.role === 'OWNER') ?? course.teachers[0];

  if (at < 0) {
    return (
      <Card variant="outlined" sx={{ ...cardSx, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('lesson.notFound')}</Typography>
      </Card>
    );
  }
  const { lesson, week } = ordered[at];
  const prev = ordered[at - 1]?.lesson;
  const next = ordered[at + 1]?.lesson;
  const state = data.courseProgress.lessons.find((l) => l.lessonId === lesson.id);
  const done = state?.status === 'COMPLETED';

  const main = (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      {lesson.type === 'VIDEO' ? (
        <LessonVideoBlock lessonId={lesson.id} durationSec={lesson.file?.durationSec ?? null} onCompleted={refetch} />
      ) : null}

      {lesson.type !== 'LINK' && lesson.body?.trim() && (
        <Card variant="outlined" sx={{ ...cardSx, ...enter(1) }}>
          <Typography component="h2" sx={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em', mb: 1.5 }}>
            {t('lesson.overview')}
          </Typography>
          <MarkdownText text={lesson.body} sx={{ fontSize: '0.9375rem', lineHeight: 1.7, color: 'text.secondary' }} />
        </Card>
      )}

      {lesson.type === 'LINK' && lesson.body && (
        <Card variant="outlined" sx={{ ...cardSx, ...enter(1), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography noWrap sx={{ minWidth: 0, flex: 1, color: 'text.secondary' }}>
            {lesson.body}
          </Typography>
          {/* The server keeps only http(s) links for LINK lessons */}
          <Button href={lesson.body} target="_blank" rel="noopener noreferrer" variant="contained" endIcon={<OpenInNewRoundedIcon />} sx={{ ...pressSx, bgcolor: STITCH.ink, boxShadow: 'none' }}>
            {t('lesson.openLink')}
          </Button>
        </Card>
      )}

      {lesson.type === 'FILE' && lesson.file && <Materials file={lesson.file} />}

      <Footer lesson={lesson} prev={prev} next={next} done={done} courseId={course.id} onDone={refetch} desktop={desktop} />
    </Stack>
  );

  return (
    <Box>
      {/* Breadcrumb + how far the student is in this lesson */}
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, minWidth: 0, fontSize: '0.8125rem' }}>
          <Link component={NextLink} href={studentHref.course(course.id)} underline="none" sx={{ fontWeight: 600, color: STITCH.ink, whiteSpace: 'nowrap' }}>
            {course.subjectName}
          </Link>
          <Box component="span" sx={{ color: '#C0C8C4' }}>
            ›
          </Box>
          <Box component="span" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {t('course.week', { week: week.order })}
          </Box>
          {desktop && (
            <>
              <Box component="span" sx={{ color: '#C0C8C4' }}>
                ›
              </Box>
              <Typography noWrap sx={{ fontSize: 'inherit', fontWeight: 600 }}>
                {lesson.title}
              </Typography>
            </>
          )}
        </Stack>
        {done ? (
          <SoftPill tone="mint">{t('lesson.completed')}</SoftPill>
        ) : (
          state?.percent != null && (
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, px: 1.5, py: 0.75, borderRadius: 2, bgcolor: '#EFF5F0' }}>
              <TimelapseRoundedIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{t('lesson.progress', { percent: state.percent })}</Typography>
            </Stack>
          )
        )}
      </Stack>

      {/* Editorial header */}
      <Box sx={{ pb: 3, mb: 3, borderBottom: 1, borderColor: STITCH.outlineSoft }}>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Box component="span" sx={{ px: 1.25, py: 0.25, borderRadius: 999, bgcolor: 'primary.main', color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
            {t('course.week', { week: week.order })} · {t(`lesson.type.${lesson.type}`)}
          </Box>
          {lesson.type === 'VIDEO' && lesson.file?.durationSec != null && <SoftPill tone="neutral">{t('lesson.duration', { time: clock(lesson.file.durationSec) })}</SoftPill>}
        </Stack>
        <Typography component="h1" sx={{ fontSize: { xs: '1.625rem', md: '2rem' }, lineHeight: { xs: '2.125rem', md: '2.5rem' }, fontWeight: 600, letterSpacing: '-0.02em' }}>
          {lesson.title}
        </Typography>
        {owner && (
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mt: 1 }}>
            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', fontSize: '0.6875rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {owner.firstName[0]}
              {owner.lastName[0]}
            </Box>
            <Typography sx={{ fontSize: '0.84375rem' }}>
              {t('lesson.taughtBy')}{' '}
              <Box component="strong" sx={{ fontWeight: 600 }}>
                {owner.firstName} {owner.lastName}
              </Box>
            </Typography>
          </Stack>
        )}
      </Box>

      {desktop ? (
        <Box sx={{ display: 'grid', gap: 4, alignItems: 'start', gridTemplateColumns: 'minmax(0, 8fr) minmax(0, 4fr)' }}>
          {main}
          <TutorSoon />
        </Box>
      ) : (
        main
      )}
    </Box>
  );
}

function LessonVideoBlock({ lessonId, durationSec, onCompleted }: { lessonId: string; durationSec: number | null; onCompleted: () => void }) {
  const { t } = useTranslation('student');
  // A fresh link every visit (3 h signed URL): never from the cache
  const { data, error } = useQuery(LESSON_VIDEO, { variables: { lessonId }, fetchPolicy: 'network-only' });
  if (error) {
    return (
      <Card variant="outlined" sx={{ ...cardSx, aspectRatio: '16 / 9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">{t('lesson.noVideo')}</Typography>
      </Card>
    );
  }
  if (!data) {
    return (
      <Box sx={{ aspectRatio: '16 / 9', borderRadius: '12px', bgcolor: '#121614', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} sx={{ color: '#A0D0C2' }} />
      </Box>
    );
  }
  return (
    <Box sx={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)', borderRadius: '12px', ...enter(0) }}>
      <VideoPlayer lessonId={lessonId} video={data.lessonVideo} durationSec={durationSec} onCompleted={onCompleted} />
    </Box>
  );
}

function Materials({ file }: { file: NonNullable<Lesson['file']> }) {
  const { t } = useTranslation('student');
  const [getUrl, { loading }] = useLazyQuery(STUDENT_FILE_URL, { fetchPolicy: 'network-only' });
  const download = async () => {
    // A 15-minute link made on click; the API never streams the file (DECISIONS §11)
    const { data } = await getUrl({ variables: { assetId: file.id } });
    if (data) window.open(data.courseFileUrl.url, '_blank', 'noopener');
  };
  return (
    <Card variant="outlined" sx={{ ...cardSx, ...enter(2) }}>
      <Typography component="h2" sx={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
        {t('lesson.materials')}
      </Typography>
      <Typography sx={{ fontSize: '0.84375rem', color: 'text.secondary', mb: 2 }}>{t('lesson.materialsHint')}</Typography>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2, borderRadius: '12px', bgcolor: '#EFF5F0' }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(1,55,45,0.08)', color: STITCH.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DescriptionOutlinedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600 }}>
              {file.name}
            </Typography>
            <Typography sx={{ fontSize: '0.84375rem', color: 'text.secondary' }}>
              {fileType(file.mimeType)} · {formatSize(file.size)}
            </Typography>
          </Box>
        </Stack>
        <Button onClick={() => void download()} disabled={loading} variant="contained" size="small" sx={{ ...pressSx, flexShrink: 0, bgcolor: STITCH.ink, boxShadow: 'none', '&:hover': { bgcolor: 'primary.main', boxShadow: 'none' } }}>
          {t('lesson.download')}
        </Button>
      </Stack>
    </Card>
  );
}

/** Previous lesson · how this lesson completes · next lesson */
function Footer({ lesson, prev, next, done, courseId, onDone, desktop }: { lesson: Lesson; prev?: Lesson; next?: Lesson; done: boolean; courseId: string; onDone: () => void; desktop: boolean }) {
  const { t } = useTranslation('student');
  const [complete, { loading }] = useMutation(COMPLETE_LESSON);
  const sent = useRef(false);

  // VIEW lessons are done once opened (once per visit; the server keeps the first time)
  useEffect(() => {
    if (lesson.completionType !== 'VIEW' || done || sent.current) return;
    sent.current = true;
    void complete({ variables: { lessonId: lesson.id } }).then(onDone, () => undefined);
  }, [lesson.id, lesson.completionType, done, complete, onDone]);

  let middle: ReactNode;
  if (done) middle = <Hint icon={<CheckCircleRoundedIcon />} text={t('lesson.completed')} />;
  else if (lesson.completionType === 'VIDEO_WATCHED') middle = <Hint icon={<CheckCircleRoundedIcon />} text={t('lesson.autoComplete')} />;
  else if (lesson.completionType === 'MANUAL')
    middle = (
      <Button
        onClick={() => void complete({ variables: { lessonId: lesson.id } }).then(onDone)}
        disabled={loading}
        variant="outlined"
        startIcon={<CheckCircleRoundedIcon />}
        sx={{ ...pressSx, borderColor: STITCH.outline, color: STITCH.ink }}
      >
        {t('lesson.markDone')}
      </Button>
    );
  else middle = <Hint icon={<CheckCircleRoundedIcon />} text={t('lesson.viewDone')} />;

  const nav = (target: Lesson | undefined, dir: 'prev' | 'next') =>
    target ? (
      <Button
        component={NextLink}
        href={studentHref.lesson(courseId, target.id)}
        variant={dir === 'next' ? 'contained' : 'text'}
        startIcon={dir === 'prev' ? <ArrowBackRoundedIcon /> : undefined}
        endIcon={dir === 'next' ? <ArrowForwardRoundedIcon /> : undefined}
        sx={{
          ...pressSx,
          justifyContent: dir === 'next' ? 'flex-end' : 'flex-start',
          px: 2,
          py: 1,
          borderRadius: 2,
          textAlign: dir === 'next' ? 'right' : 'left',
          minWidth: 0,
          width: { xs: '100%', md: 'auto' },
          boxShadow: 'none',
          ...(dir === 'next' ? { bgcolor: STITCH.ink, '&:hover': { bgcolor: 'primary.main', boxShadow: 'none' } } : { color: 'text.primary' }),
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '0.75rem', opacity: 0.75 }}>{t(dir === 'prev' ? 'lesson.prev' : 'lesson.next')}</Typography>
          <Typography noWrap sx={{ fontSize: '0.9375rem', fontWeight: 600, maxWidth: 220 }}>
            {target.title}
          </Typography>
        </Box>
      </Button>
    ) : (
      desktop && <Box sx={{ width: 120 }} />
    );

  return (
    <Card variant="outlined" sx={{ ...cardSx, p: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2, ...enter(3) }}>
      {nav(prev, 'prev')}
      {middle}
      {nav(next, 'next')}
    </Card>
  );
}

function Hint({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: 2, bgcolor: '#EFF5F0', color: 'text.secondary', '& svg': { fontSize: 18, color: 'secondary.main' } }}>
      {icon}
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{text}</Typography>
    </Stack>
  );
}

/** The Study Tutor's place (Stitch's right panel) until the AI tutor phase */
function TutorSoon() {
  const { t } = useTranslation('student');
  return (
    <Card variant="outlined" sx={{ ...cardSx, position: 'sticky', top: 96, ...enter(2) }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PsychologyOutlinedIcon fontSize="small" />
          </Box>
          <Typography sx={{ fontWeight: 600 }}>{t('lesson.tutor.title')}</Typography>
        </Stack>
        <SoftPill tone="neutral">{t('lesson.tutor.soon')}</SoftPill>
      </Stack>
      <Typography sx={{ fontSize: '0.84375rem', color: 'text.secondary', lineHeight: 1.6 }}>{t('lesson.tutor.body')}</Typography>
    </Card>
  );
}
