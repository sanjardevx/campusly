import { useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Alert, Button, CircularProgress, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { CREATE_LESSON, PUBLISH_LESSON, SET_LESSON_FILE, SET_LESSON_VIDEO, UPDATE_LESSON } from '@/apollo/teacher/mutation';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { FormField } from '@/libs/components/auth/FormField';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import type { Lesson, Week } from './model';
import { UploadBox, type AttachedFile } from './UploadBox';

/**
 * "Add to Week → Lesson (video) / File", and editing those lessons. The file is uploaded first
 * (it needs only the course), then the lesson is created and the file attached to it.
 */
export function LessonDrawer({
  courseId,
  week,
  type,
  lesson,
  onClose,
}: {
  courseId: string;
  week: Week;
  /** READING / LINK come from the seed and older lessons: they can be edited, not added here */
  type: 'VIDEO' | 'FILE' | 'READING' | 'LINK';
  /** null = a new lesson */
  lesson: Lesson | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const client = useApolloClient();
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [body, setBody] = useState(lesson?.body ?? '');
  const hasFile = type === 'VIDEO' || type === 'FILE';
  const [file, setFile] = useState<AttachedFile | null>(
    lesson?.file ? { id: lesson.file.id, name: lesson.file.name, size: lesson.file.size, mimeType: lesson.file.mimeType } : null,
  );
  const [publish, setPublish] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [create] = useMutation(CREATE_LESSON);
  const [update] = useMutation(UPDATE_LESSON);
  const [setVideo] = useMutation(SET_LESSON_VIDEO);
  const [setFileOf] = useMutation(SET_LESSON_FILE);
  const [publishLesson] = useMutation(PUBLISH_LESSON);

  const valid = title.trim().length >= 1 && !uploading && (type !== 'LINK' || /^https?:\/\/\S+$/.test(body.trim()));
  const weekLabel = week.title.split(':')[0];

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      let id = lesson?.id;
      if (!id) {
        const res = await create({ variables: { input: { moduleId: week.id, title: title.trim(), type, body: hasFile ? undefined : body } } });
        id = res.data!.createLesson.id;
      } else if (title.trim() !== lesson!.title || (!hasFile && body !== (lesson!.body ?? ''))) {
        await update({ variables: { input: { id, title: title.trim(), body: hasFile ? undefined : body } } });
      }
      const fileChanged = (file?.id ?? null) !== (lesson?.file?.id ?? null);
      if (hasFile && fileChanged) {
        const input = { lessonId: id, assetId: file?.id ?? null };
        if (type === 'VIDEO') await setVideo({ variables: { input } });
        else await setFileOf({ variables: { input } });
      }
      // A new lesson is published now or kept as a draft; editing keeps its state
      if (!lesson && publish) await publishLesson({ variables: { input: { id, publish } } });
      await client.refetchQueries({ include: ['TeacherCourse'] });
      onClose();
    } catch (err) {
      setError(errorText(errorCode(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SideDrawer
      open
      title={lesson ? t(`course.lesson.edit${type}`) : t(`course.lesson.new${type}`, { week: weekLabel })}
      closeLabel={t('course.close')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} color="inherit">
            {t('course.cancel')}
          </Button>
          <Button
            variant="contained"
            disableElevation
            disabled={!valid || saving}
            onClick={save}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ ml: 'auto' }}
          >
            {lesson ? t('course.save') : t('course.lesson.create')}
          </Button>
        </>
      }
    >
      <DrawerSection title={t('course.lesson.basics')}>
        <FormField id="lesson-title" label={t('course.lesson.title')} value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth size="small" slotProps={{ htmlInput: { maxLength: 150 } }} />
        {type === 'READING' && (
          <FormField id="lesson-body" label={t('course.lesson.body')} value={body} onChange={(e) => setBody(e.target.value)} multiline minRows={6} fullWidth size="small" slotProps={{ htmlInput: { maxLength: 50_000 } }} />
        )}
        {type === 'LINK' && (
          <FormField id="lesson-url" label={t('course.lesson.url')} value={body} onChange={(e) => setBody(e.target.value)} fullWidth size="small" placeholder="https://" type="url" />
        )}
        {hasFile && (
        <Stack spacing={0.75}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
            {type === 'VIDEO' ? t('course.lesson.video') : t('course.lesson.file')}
          </Typography>
          <UploadBox
            courseId={courseId}
            kinds={type === 'VIDEO' ? ['VIDEO'] : ['DOCUMENT', 'IMAGE']}
            max={1}
            files={file ? [file] : []}
            onAdd={(f) => {
              setFile(f);
              // A new lesson takes the file's name until the teacher types one
              if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''));
            }}
            onRemove={() => setFile(null)}
            onBusy={setUploading}
          />
          {type === 'VIDEO' && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('course.lesson.videoHint')}</Typography>
          )}
        </Stack>
        )}
      </DrawerSection>

      {!lesson && (
        <DrawerSection title={t('course.visibility.title')}>
          <RadioGroup value={publish ? 'now' : 'draft'} onChange={(e) => setPublish(e.target.value === 'now')}>
            <FormControlLabel value="now" control={<Radio size="small" />} label={t('course.visibility.now')} />
            <FormControlLabel value="draft" control={<Radio size="small" />} label={t('course.visibility.draft')} />
          </RadioGroup>
          {week.isHidden && <Alert severity="info">{t('course.visibility.weekHidden')}</Alert>}
        </DrawerSection>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </SideDrawer>
  );
}
