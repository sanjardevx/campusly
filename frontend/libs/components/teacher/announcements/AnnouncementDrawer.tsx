import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, Button, Checkbox, CircularProgress, Divider, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { useTranslation } from 'next-i18next/pages';
import { CREATE_COURSE_ANNOUNCEMENTS, UPDATE_ANNOUNCEMENT } from '@/apollo/teacher/mutation';
import { SideDrawer } from '@/libs/components/admin/SideDrawer';
import { FormField } from '@/libs/components/auth/FormField';
import { MarkdownField } from '@/libs/components/teacher/course/MarkdownField';
import { UploadBox, type AttachedFile } from '@/libs/components/teacher/course/UploadBox';
import { errorCode } from '@/libs/errors';
import type { TeacherAnnouncementsQuery } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';

type Item = TeacherAnnouncementsQuery['announcements']['list'][number];
const MAX_FILES = 5;

/**
 * Stitch "New announcement" drawer. A new one goes to every ticked course (one announcement each,
 * saved together); editing changes one announcement, its course stays. Files are uploaded under
 * the first ticked course; the server accepts them for any of the ticked courses.
 */
export function AnnouncementDrawer({
  courses,
  announcement,
  defaultCourse,
  onClose,
}: {
  courses: { id: string; title: string; studentCount: number }[];
  /** null = a new announcement */
  announcement: Item | null;
  defaultCourse?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [body, setBody] = useState(announcement?.body ?? '');
  const [picked, setPicked] = useState<string[]>(announcement?.courseId ? [announcement.courseId] : defaultCourse ? [defaultCourse] : []);
  const [pinned, setPinned] = useState(announcement?.isPinned ?? false);
  const [files, setFiles] = useState<AttachedFile[]>(announcement?.files.map((f) => ({ id: f.id, name: f.name, size: f.size, mimeType: f.mimeType })) ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = { refetchQueries: ['TeacherAnnouncements', 'TeacherDashboard'], awaitRefetchQueries: true };
  const [create, createState] = useMutation(CREATE_COURSE_ANNOUNCEMENTS, options);
  const [update, updateState] = useMutation(UPDATE_ANNOUNCEMENT, options);
  const saving = createState.loading || updateState.loading;
  const valid = title.trim().length >= 2 && body.trim().length > 0 && picked.length > 0 && !uploading;

  const toggle = (id: string) => setPicked((all) => (all.includes(id) ? all.filter((c) => c !== id) : [...all, id]));

  const save = async () => {
    setError(null);
    const fileAssetIds = files.map((f) => f.id);
    try {
      if (announcement) {
        await update({ variables: { input: { id: announcement.id, title: title.trim(), body, isPinned: pinned, fileAssetIds } } });
      } else {
        await create({ variables: { input: { courseIds: picked, title: title.trim(), body, isPinned: pinned, fileAssetIds } } });
      }
      onClose();
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  return (
    <SideDrawer
      open
      title={announcement ? t('announcements.editTitle') : t('announcements.newTitle')}
      closeLabel={t('course.close')}
      onClose={onClose}
      footer={
        <>
          <Button color="inherit" onClick={onClose}>
            {t('course.cancel')}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={save}
            disabled={!valid || saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SendOutlinedIcon />}
            sx={{ ml: 'auto' }}
          >
            {announcement ? t('course.save') : t('announcements.publish')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        <FormField
          id="ann-title"
          label={t('announcements.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
          size="small"
          placeholder={t('announcements.titleHint')}
          action={<Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled' }}>{t('announcements.maxChars', { count: 150 })}</Typography>}
          slotProps={{ htmlInput: { maxLength: 150 } }}
        />
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 }}>
            {t('announcements.message')} *
          </Typography>
          <MarkdownField value={body} onChange={setBody} label={t('announcements.message')} maxLength={10_000} minRows={6} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 }}>
            {t('announcements.attachments')}
          </Typography>
          {picked.length ? (
            <UploadBox
              courseId={picked[0]}
              kinds={['DOCUMENT', 'IMAGE']}
              max={MAX_FILES}
              files={files}
              onAdd={(f) => setFiles((all) => [...all, f])}
              onRemove={(id) => setFiles((all) => all.filter((f) => f.id !== id))}
              onBusy={setUploading}
            />
          ) : (
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{t('announcements.pickFirst')}</Typography>
          )}
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 }}>
            {t('announcements.sendTo')}
          </Typography>
          <Stack divider={<Divider flexItem />} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, px: 1.5, py: 0.5 }}>
            {courses.map((c) => (
              <Stack key={c.id} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <FormControlLabel
                  control={<Checkbox size="small" checked={picked.includes(c.id)} onChange={() => toggle(c.id)} disabled={!!announcement} />}
                  label={<Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{c.title}</Typography>}
                />
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{t('dashboard.students', { count: c.studentCount })}</Typography>
              </Stack>
            ))}
          </Stack>
          {announcement && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.75 }}>{t('announcements.courseFixed')}</Typography>}
        </Box>
        <FormControlLabel
          labelPlacement="start"
          sx={{ mx: 0, justifyContent: 'space-between' }}
          control={<Switch checked={pinned} onChange={(e) => setPinned(e.target.checked)} />}
          label={
            <Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('announcements.pin')}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('announcements.pinHint')}</Typography>
            </Box>
          }
        />
        <Stack direction="row" sx={{ gap: 1, p: 1.5, borderRadius: 2, bgcolor: 'background.default', border: 1, borderColor: 'divider' }}>
          <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled', mt: 0.25 }} />
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.6 }}>{t('announcements.who')}</Typography>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </SideDrawer>
  );
}
