import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, Button, ButtonBase, CircularProgress, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import { useTranslation } from 'next-i18next/pages';
import { ARCHIVE_SITE_OPEN_COURSE, SAVE_SITE_OPEN_COURSE } from '@/apollo/admin/mutation';
import { ConfirmDialog } from '@/libs/components/admin/ConfirmDialog';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { errorCode } from '@/libs/errors';
import type { AdminSiteOpenCoursesQuery, SiteCourseCategory } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { clock, toSeconds, youtubeId, youtubeThumb, youtubeWatch } from '@/libs/youtube';
import { LangTabs, LocalizedField, type SiteLang, StatusPill, emptyL, fromL, toL, useReorder } from './shared';

export type AdminOpenCourse = AdminSiteOpenCoursesQuery['adminSiteOpenCourses'][number];

export const COURSE_CATEGORIES: SiteCourseCategory[] = ['IT', 'MATH', 'AI', 'STUDY_ABROAD'];

interface Lesson {
  key: string;
  title: string;
  youtubeId: string;
  /** "8:42" or '' (YouTube does not tell the length without an API key) */
  duration: string;
}

/** Row keys for the lesson list (drag and remove need a stable key, a video can repeat) */
let lessonSeq = 0;
const keyed = (l: Omit<Lesson, 'key'>): Lesson => ({ ...l, key: String(lessonSeq++) });

const label = { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 } as const;

/** The video picture with its length in the corner */
export function LessonThumb({ id, sec, width = 72 }: { id: string; sec: number | null; width?: number }) {
  return (
    <Box sx={{ position: 'relative', width, aspectRatio: '16 / 9', borderRadius: 1, overflow: 'hidden', bgcolor: '#1C1917', flexShrink: 0 }}>
      <Box component="img" src={youtubeThumb(id)} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {sec != null && <Box sx={{ position: 'absolute', right: 3, bottom: 3, px: 0.5, borderRadius: 0.5, bgcolor: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '0.625rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{clock(sec)}</Box>}
    </Box>
  );
}

/**
 * Stitch "Campusly Admin — Website: New Open Course": title, category, source, the lessons (drag to
 * reorder, remove) and "Add lesson N" — a YouTube link (its picture confirms the video), the lesson
 * title and its length, "Save & add next" or Enter. "Save draft" / "Publish course". The video
 * length is typed by hand: reading it from YouTube needs an API key the school does not have.
 */
export function OpenCourseDrawer({ course, onClose, onSaved }: { course: AdminOpenCourse | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const [lang, setLang] = useState<SiteLang>('en');
  const [title, setTitle] = useState(() => toL(course?.title));
  const [description, setDescription] = useState(() => (course?.description ? toL(course.description) : emptyL()));
  const [category, setCategory] = useState<SiteCourseCategory>(course?.category ?? 'IT');
  const [source, setSource] = useState(course?.source ?? '');
  const [lessons, setLessons] = useState<Lesson[]>(() => (course?.lessons ?? []).map((l) => keyed({ title: l.title, youtubeId: l.youtubeId, duration: l.durationSec != null ? clock(l.durationSec) : '' })));
  const [link, setLink] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [thumbOk, setThumbOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [save, { loading }] = useMutation(SAVE_SITE_OPEN_COURSE);
  const [archive, { loading: archiving }] = useMutation(ARCHIVE_SITE_OPEN_COURSE);

  const drag = useReorder(
    lessons.map((l) => l.key),
    (next) => setLessons(next.map((k) => lessons.find((l) => l.key === k)!)),
  );

  const draftId = youtubeId(link);
  const durationBad = !!duration.trim() && toSeconds(duration) == null;
  const canAdd = !!draftId && !!lessonTitle.trim() && !durationBad && lessons.length < 50;
  const add = () => {
    if (!canAdd) return;
    setLessons([...lessons, keyed({ title: lessonTitle.trim(), youtubeId: draftId!, duration: duration.trim() })]);
    setLink('');
    setLessonTitle('');
    setDuration('');
    setThumbOk(null);
  };

  const published = course?.status === 'PUBLISHED';
  const valid = !!title.en.trim();
  const submit = async (publish: boolean) => {
    setError(null);
    try {
      await save({
        variables: {
          input: {
            id: course?.id,
            category,
            title: fromL(title)!,
            source: source.trim() || null,
            description: fromL(description),
            lessons: lessons.map((l) => ({ title: l.title, youtubeUrl: youtubeWatch(l.youtubeId), duration: l.duration || null })),
            publish,
          },
        },
      });
      onSaved();
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  return (
    <>
      <SideDrawer
        open
        title={course ? t('site.courses.edit') : t('site.courses.new')}
        closeLabel={t('site.close')}
        onClose={onClose}
        footer={
          <>
            {course && (
              <IconButton color="error" onClick={() => setConfirmArchive(true)} aria-label={t('site.archive')}>
                <Inventory2OutlinedIcon />
              </IconButton>
            )}
            <Stack direction="row" sx={{ flex: 1, gap: 0.75, alignItems: 'center', color: 'text.secondary', minWidth: 0 }}>
              <InfoOutlinedIcon sx={{ fontSize: 16, flexShrink: 0 }} />
              <Typography variant="caption" noWrap>
                {t('site.courses.footerHint', { count: lessons.length })}
              </Typography>
            </Stack>
            <Button color="inherit" onClick={() => void submit(false)} disabled={!valid || loading}>
              {published ? t('site.courses.toDraft') : t('site.courses.saveDraft')}
            </Button>
            <Button variant="contained" disableElevation onClick={() => void submit(true)} disabled={!valid || loading || lessons.length === 0} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PublishRoundedIcon />}>
              {published ? t('site.saveChanges') : t('site.courses.publish')}
            </Button>
          </>
        }
      >
        <Box sx={{ mt: -1, mb: 2 }}>
          <StatusPill tone={published ? 'green' : 'grey'}>{t(`site.courses.status.${published ? 'PUBLISHED' : 'DRAFT'}`)}</StatusPill>
        </Box>
        <LangTabs
          lang={lang}
          onLang={setLang}
          fields={[title, description]}
          onTranslated={([a, b]) => {
            setTitle(a);
            setDescription(b);
          }}
        />

        <DrawerSection title={t('site.courses.basics')}>
          <LocalizedField id="course-title" label={t('site.courses.title')} value={title} onChange={setTitle} lang={lang} max={120} required />
          <Box>
            <Typography sx={label}>{t('site.courses.category')}</Typography>
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              {COURSE_CATEGORIES.map((c) => (
                <ButtonBase key={c} onClick={() => setCategory(c)} aria-pressed={category === c} sx={{ px: 1.75, py: 0.75, borderRadius: 2, fontSize: '0.8125rem', fontWeight: 600, bgcolor: category === c ? 'primary.main' : 'action.hover', color: category === c ? '#fff' : 'text.secondary' }}>
                  {t(`site.courses.cat.${c}`)}
                </ButtonBase>
              ))}
            </Stack>
          </Box>
          <TextField size="small" label={t('site.courses.source')} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Khan Academy" slotProps={{ htmlInput: { maxLength: 60 } }} />
          <LocalizedField id="course-description" label={t('site.courses.description')} value={description} onChange={setDescription} lang={lang} max={200} rows={2} />
        </DrawerSection>

        <DrawerSection title={t('site.courses.lessonsN', { count: lessons.length })}>
          {lessons.length > 1 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: -1, alignSelf: 'flex-end' }}>
              {t('site.dragToReorder')}
            </Typography>
          )}
          {lessons.map((l, i) => {
            const sec = l.duration ? toSeconds(l.duration) : null;
            return (
              <Stack key={l.key} {...drag.rowProps(l.key)} direction="row" sx={{ alignItems: 'center', gap: 1.25, p: 1, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper', opacity: drag.dragging === l.key ? 0.5 : 1 }}>
                {drag.handle(l.key, t('site.dragToReorder'))}
                <LessonThumb id={l.youtubeId} sec={sec} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {i + 1}. {l.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{[sec != null ? t('site.courses.durationN', { time: clock(sec) }) : null, 'YouTube'].filter(Boolean).join(' · ')}</Typography>
                </Box>
                <IconButton size="small" onClick={() => setLessons(lessons.filter((x) => x.key !== l.key))} aria-label={t('site.courses.removeLesson', { n: i + 1 })}>
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            );
          })}

          <Box sx={{ p: 2, borderRadius: 2, border: 1.5, borderColor: 'primary.main', bgcolor: 'rgba(31,78,67,0.03)' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'primary.main' }}>
                <AddRoundedIcon sx={{ fontSize: 16 }} />
                {t('site.courses.addLessonN', { n: lessons.length + 1 })}
              </Stack>
            </Stack>
            <Stack sx={{ gap: 1.5 }}>
              <TextField
                size="small"
                fullWidth
                label={t('site.courses.youtubeLink')}
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setThumbOk(null);
                }}
                placeholder="https://youtu.be/…"
                error={!!link.trim() && !draftId}
                helperText={link.trim() && !draftId ? t('site.courses.linkBad') : undefined}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><LinkRoundedIcon fontSize="small" /></InputAdornment> }, htmlInput: { maxLength: 200, spellCheck: false } }}
              />
              {draftId && (
                <Stack direction="row" sx={{ gap: 1.25, alignItems: 'center', p: 1, borderRadius: 1.5, bgcolor: thumbOk === false ? '#FDECEC' : '#E8EFEA' }}>
                  <Box component="img" src={youtubeThumb(draftId)} alt="" onLoad={(e) => setThumbOk((e.target as HTMLImageElement).naturalWidth > 120)} onError={() => setThumbOk(false)} sx={{ width: 64, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 1 }} />
                  {thumbOk !== false && <CheckCircleRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />}
                  <Typography sx={{ fontSize: '0.8125rem', color: thumbOk === false ? '#B42318' : 'text.primary' }}>{thumbOk === false ? t('site.courses.notFound') : t('site.courses.found')}</Typography>
                </Stack>
              )}
              <Stack direction="row" sx={{ gap: 1.5 }}>
                <TextField
                  size="small"
                  label={t('site.courses.lessonTitle')}
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      add();
                    }
                  }}
                  slotProps={{ htmlInput: { maxLength: 150 } }}
                  sx={{ flex: 1 }}
                />
                <TextField size="small" label={t('site.courses.length')} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="8:42" error={durationBad} slotProps={{ htmlInput: { maxLength: 8, inputMode: 'numeric' } }} sx={{ width: 110 }} />
              </Stack>
              <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
                <Button variant="contained" disableElevation startIcon={<AddRoundedIcon />} onClick={add} disabled={!canAdd}>
                  {t('site.courses.addNext')}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {t('site.courses.enterHint')}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </DrawerSection>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </SideDrawer>
      <ConfirmDialog
        open={confirmArchive}
        title={t('site.courses.archiveTitle')}
        body={t('site.courses.archiveBody')}
        confirmLabel={t('site.archive')}
        danger
        busy={archiving}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() =>
          void archive({ variables: { id: course!.id } }).then(() => {
            setConfirmArchive(false);
            onSaved();
          })
        }
      />
    </>
  );
}
