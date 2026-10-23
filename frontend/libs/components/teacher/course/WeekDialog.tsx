import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { CREATE_MODULE, UPDATE_MODULE } from '@/apollo/teacher/mutation';
import { FormField } from '@/libs/components/auth/FormField';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import type { Week } from './model';

const REFETCH = { refetchQueries: ['TeacherCourse'], awaitRefetchQueries: true };

/** "YYYY-MM-DD" + n days */
function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

/**
 * "Add week" and "Edit week": title and dates. A new week follows the last one: "Week 9", the
 * Monday after it, seven days. A new week starts as a draft (students do not see it yet).
 */
export function WeekDialog({ courseId, week, weeks, onClose }: { courseId: string; week: Week | null; weeks: Week[]; onClose: () => void }) {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const last = weeks.at(-1);
  const nextStart = last?.endsAt ? addDays(last.endsAt, 1) : '';
  const [form, setForm] = useState({
    title: week?.title ?? t('course.week.defaultTitle', { n: weeks.length + 1 }),
    startsAt: week?.startsAt ?? nextStart,
    endsAt: week?.endsAt ?? (nextStart ? addDays(nextStart, 6) : ''),
  });
  const [error, setError] = useState<string | null>(null);
  const [create, createState] = useMutation(CREATE_MODULE, REFETCH);
  const [update, updateState] = useMutation(UPDATE_MODULE, REFETCH);
  const saving = createState.loading || updateState.loading;
  const datesOk = !form.startsAt || !form.endsAt || form.endsAt >= form.startsAt;
  const valid = form.title.trim().length > 0 && datesOk;

  const save = async () => {
    setError(null);
    const fields = { title: form.title.trim(), startsAt: form.startsAt || undefined, endsAt: form.endsAt || undefined };
    try {
      if (week) await update({ variables: { input: { id: week.id, ...fields } } });
      else await create({ variables: { input: { courseId, ...fields } } });
      onClose();
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{week ? t('course.week.editTitle') : t('course.week.addTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <FormField id="week-title" label={t('course.week.title')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth size="small" slotProps={{ htmlInput: { maxLength: 120 } }} />
          <Stack direction="row" spacing={1.5}>
            <FormField id="week-start" label={t('course.week.starts')} type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} fullWidth size="small" />
            <FormField
              id="week-end"
              label={t('course.week.ends')}
              type="date"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              fullWidth
              size="small"
              error={!datesOk}
              helperText={!datesOk ? t('course.week.datesOrder') : undefined}
            />
          </Stack>
          {!week && <Alert severity="info">{t('course.week.draftHint')}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={saving} sx={{ borderColor: 'divider' }}>
          {t('course.cancel')}
        </Button>
        <Button variant="contained" disableElevation onClick={save} disabled={!valid || saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {week ? t('course.save') : t('course.week.add')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
