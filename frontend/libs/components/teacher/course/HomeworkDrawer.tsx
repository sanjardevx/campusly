import { useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import LinkIcon from '@mui/icons-material/Link';
import { useTranslation } from 'next-i18next/pages';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { CREATE_ASSIGNMENT, PUBLISH_ASSIGNMENT, UPDATE_ASSIGNMENT } from '@/apollo/teacher/mutation';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { FormField } from '@/libs/components/auth/FormField';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { utcToZoned, zonedToUtc } from '@/libs/timezone';
import { UPLOAD_LIMITS } from '@/libs/upload';
import type { Assignment, Week } from './model';
import { formatSize } from './model';
import { UploadBox, type AttachedFile } from './UploadBox';

/** File types a student may hand in (the server's SUBMISSION_FILE_TYPES); JPG and PNG go together */
const FILE_TYPES: { label: string; values: string[] }[] = [
  { label: 'PDF', values: ['pdf'] },
  { label: 'JPG/PNG', values: ['jpg', 'png'] },
  { label: 'DOCX', values: ['docx'] },
  { label: 'PPTX', values: ['pptx'] },
  { label: 'WEBP', values: ['webp'] },
];
/** Uploads per student when resubmission is on (the server allows 1–10) */
const ATTEMPTS = [2, 3, 5, 10];
const MAX_FILES = 5;

/**
 * Stitch "New homework · Week 6" (and editing a homework). The due date is typed in the school's
 * timezone and stored as UTC. Instructions are Markdown: the toolbar only inserts its marks.
 */
export function HomeworkDrawer({
  courseId,
  week,
  assignment,
  onClose,
}: {
  courseId: string;
  week: Week | null;
  /** null = a new homework in `week` */
  assignment: Assignment | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const client = useApolloClient();
  const { data: settings } = useQuery(SCHOOL_SETTINGS);
  const zone = settings?.schoolSettings.timezone ?? 'Asia/Tashkent';
  const text = useRef<HTMLTextAreaElement>(null);

  const [form, setForm] = useState(() => ({
    title: assignment?.title ?? '',
    instructions: assignment?.instructions ?? '',
    // A new homework is due at the end of its week, 23:59 school time
    dueAt: assignment?.dueAt ? utcToZoned(assignment.dueAt, zone) : week?.endsAt ? `${week.endsAt}T23:59` : '',
    maxScore: assignment ? String(assignment.maxScore) : '10',
    allowLate: assignment?.allowLate ?? false,
    resubmit: (assignment?.maxAttempts ?? 1) > 1,
    attempts: Math.max(2, assignment?.maxAttempts ?? 3),
    types: assignment?.acceptedFileTypes ?? ['pdf', 'jpg', 'png', 'docx'],
    publish: true,
  }));
  const [files, setFiles] = useState<AttachedFile[]>(
    assignment?.files.map((f) => ({ id: f.id, name: f.name, size: f.size, mimeType: f.mimeType })) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [create] = useMutation(CREATE_ASSIGNMENT);
  const [update] = useMutation(UPDATE_ASSIGNMENT);
  const [publish] = useMutation(PUBLISH_ASSIGNMENT);

  // An exam is offline (DECISIONS §10): no uploads, no submission settings
  const isExam = assignment?.type === 'EXAM';
  const score = Number(form.maxScore);
  const scoreOk = Number.isFinite(score) && score >= 0.5 && score <= 1000;
  const valid = form.title.trim().length > 0 && scoreOk && (isExam || form.types.length > 0) && !uploading;
  const weekLabel = week?.title.split(':')[0];

  /** Wrap the selection in Markdown marks (or put them at the cursor) */
  const mark = (before: string, after = '', placeholder = '') => {
    const el = text.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const chosen = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + chosen + after + value.slice(e);
    setForm((f) => ({ ...f, instructions: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + chosen.length);
    });
  };

  const toggleType = (values: string[]) =>
    setForm((f) => {
      const on = values.every((v) => f.types.includes(v));
      return { ...f, types: on ? f.types.filter((v) => !values.includes(v)) : [...new Set([...f.types, ...values])] };
    });

  const save = async () => {
    setError(null);
    setSaving(true);
    const fields = {
      title: form.title.trim(),
      instructions: form.instructions.trim() || undefined,
      dueAt: form.dueAt ? zonedToUtc(form.dueAt, zone) : undefined,
      maxScore: score,
      ...(isExam
        ? {}
        : { allowLate: form.allowLate, maxAttempts: form.resubmit ? form.attempts : 1, acceptedFileTypes: form.types }),
      fileAssetIds: files.map((f) => f.id),
    };
    try {
      if (assignment) {
        await update({ variables: { input: { id: assignment.id, ...fields } } });
      } else {
        const res = await create({ variables: { input: { courseId, type: 'HOMEWORK', moduleId: week?.id, ...fields } } });
        if (form.publish) await publish({ variables: { input: { id: res.data!.createAssignment.id, publish: true } } });
      }
      await client.refetchQueries({ include: ['CourseAssignments'] });
      onClose();
    } catch (err) {
      setError(errorText(errorCode(err)));
    } finally {
      setSaving(false);
    }
  };

  const label = (key: string) => (
    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 }}>{t(key)}</Typography>
  );

  return (
    <SideDrawer
      open
      title={assignment ? t(`course.homework.edit${assignment.type}`) : weekLabel ? t('course.homework.newTitle', { week: weekLabel }) : t('course.homework.newTitleNoWeek')}
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
            {assignment ? t('course.save') : t('course.homework.create')}
          </Button>
        </>
      }
    >
      <DrawerSection title={t('course.lesson.basics')}>
        <FormField
          id="hw-title"
          label={t('course.homework.title')}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          fullWidth
          size="small"
          slotProps={{ htmlInput: { maxLength: 150 } }}
        />
        <Box>
          {label('course.homework.instructions')}
          {/* Minimal formatting toolbar: it writes Markdown into the text */}
          <Stack direction="row" sx={{ gap: 0.25, p: 0.5, border: 1, borderBottom: 0, borderColor: 'divider', borderRadius: '8px 8px 0 0', bgcolor: 'background.default' }}>
            <Tooltip title={t('course.homework.bold')}>
              <IconButton size="small" onClick={() => mark('**', '**', t('course.homework.boldText'))} aria-label={t('course.homework.bold')}>
                <FormatBoldIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('course.homework.italic')}>
              <IconButton size="small" onClick={() => mark('_', '_', t('course.homework.italicText'))} aria-label={t('course.homework.italic')}>
                <FormatItalicIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Box sx={{ width: '1px', bgcolor: 'divider', mx: 0.5, my: 0.75 }} />
            <Tooltip title={t('course.homework.list')}>
              <IconButton size="small" onClick={() => mark('\n- ', '', t('course.homework.listText'))} aria-label={t('course.homework.list')}>
                <FormatListBulletedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('course.homework.link')}>
              <IconButton size="small" onClick={() => mark('[', '](https://)', t('course.homework.linkText'))} aria-label={t('course.homework.link')}>
                <LinkIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <TextField
            inputRef={text}
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            multiline
            minRows={3}
            fullWidth
            size="small"
            placeholder={t('course.homework.instructionsHint')}
            slotProps={{ htmlInput: { maxLength: 20_000, 'aria-label': t('course.homework.instructions') } }}
            sx={{ '& .MuiOutlinedInput-root': { borderTopLeftRadius: 0, borderTopRightRadius: 0 } }}
          />
        </Box>
        <Box>
          {label('course.homework.attachments')}
          <UploadBox
            courseId={courseId}
            kinds={['DOCUMENT', 'IMAGE']}
            max={MAX_FILES}
            files={files}
            onAdd={(f) => setFiles((all) => [...all, f])}
            onRemove={(id) => setFiles((all) => all.filter((f) => f.id !== id))}
            onBusy={setUploading}
          />
        </Box>
      </DrawerSection>

      <DrawerSection title={t('course.homework.datesPoints')}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <FormField
              id="hw-due"
              label={t('course.homework.due')}
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              fullWidth
              size="small"
              helperText={t('course.homework.zone', { zone: zone.split('/').pop()?.replace('_', ' ') })}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <FormField
              id="hw-points"
              label={t('course.homework.maxScore')}
              type="number"
              value={form.maxScore}
              onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
              fullWidth
              size="small"
              error={!scoreOk}
              slotProps={{
                htmlInput: { min: 0.5, max: 1000, step: 0.5 },
                input: { endAdornment: <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('course.homework.pointsUnit')}</Typography> },
              }}
            />
          </Box>
        </Stack>
      </DrawerSection>

      {!isExam && (
      <DrawerSection title={t('course.homework.submission')}>
        <Box>
          <FormControlLabel
            labelPlacement="start"
            sx={{ mx: 0, width: '100%', justifyContent: 'space-between' }}
            control={<Switch checked={form.allowLate} onChange={(e) => setForm({ ...form, allowLate: e.target.checked })} />}
            label={<Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{t('course.homework.allowLate')}</Typography>}
          />
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', pr: 6 }}>{t('course.homework.allowLateHint')}</Typography>
        </Box>
        <Box>
          <FormControlLabel
            labelPlacement="start"
            sx={{ mx: 0, width: '100%', justifyContent: 'space-between' }}
            control={<Switch checked={form.resubmit} onChange={(e) => setForm({ ...form, resubmit: e.target.checked })} />}
            label={<Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{t('course.homework.resubmit')}</Typography>}
          />
          {form.resubmit && (
            <Select
              size="small"
              value={form.attempts}
              onChange={(e) => setForm({ ...form, attempts: Number(e.target.value) })}
              sx={{ mt: 0.5, fontSize: '0.8125rem' }}
              inputProps={{ 'aria-label': t('course.homework.resubmit') }}
            >
              {ATTEMPTS.map((n) => (
                <MenuItem key={n} value={n}>
                  {t('course.homework.attempts', { count: n })}
                </MenuItem>
              ))}
            </Select>
          )}
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>{t('course.homework.resubmitHint')}</Typography>
        </Box>
        <Box>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{t('course.homework.fileTypes')}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {t('course.homework.maxSize', { size: formatSize(UPLOAD_LIMITS.DOCUMENT.maxBytes), image: formatSize(UPLOAD_LIMITS.IMAGE.maxBytes) })}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {FILE_TYPES.map(({ label: name, values }) => {
              const on = values.every((v) => form.types.includes(v));
              return (
                <Chip
                  key={name}
                  label={name}
                  size="small"
                  icon={on ? <CheckIcon /> : undefined}
                  onClick={() => toggleType(values)}
                  aria-pressed={on}
                  variant={on ? 'filled' : 'outlined'}
                  sx={on ? { bgcolor: 'primary.light', color: 'primary.main', border: 1, borderColor: 'primary.main', '& .MuiChip-icon': { color: 'primary.main' } } : undefined}
                />
              );
            })}
          </Stack>
          {form.types.length === 0 && (
            <Typography sx={{ fontSize: '0.75rem', color: 'error.main', mt: 0.75 }}>{t('course.homework.fileTypesNone')}</Typography>
          )}
        </Box>
      </DrawerSection>
      )}

      {!assignment && (
        <DrawerSection title={t('course.visibility.title')}>
          <RadioGroup value={form.publish ? 'now' : 'draft'} onChange={(e) => setForm({ ...form, publish: e.target.value === 'now' })}>
            <FormControlLabel value="now" control={<Radio size="small" />} label={t('course.visibility.now')} />
            <FormControlLabel value="draft" control={<Radio size="small" />} label={t('course.visibility.draft')} />
          </RadioGroup>
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
