import { useState } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { CREATE_ASSIGNMENT, UPDATE_ASSIGNMENT } from '@/apollo/teacher/mutation';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { FormField } from '@/libs/components/auth/FormField';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { utcToZoned, zonedToUtc } from '@/libs/timezone';
import type { Assignment, Week } from './model';
import { MarkdownField } from './MarkdownField';

/** Time limit choices in minutes (the server allows 1–180) */
const MINUTES = [5, 10, 15, 20, 30, 45, 60, 90];

/**
 * A quiz's settings (title, instructions, due date, time limit). The questions are written on the
 * quiz's own page, so a new quiz starts as a draft and opens there; it is published when ready.
 */
export function QuizDrawer({
  courseId,
  week,
  assignment,
  onClose,
}: {
  courseId: string;
  week: Week | null;
  /** null = a new quiz in `week` */
  assignment: Assignment | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const router = useRouter();
  const client = useApolloClient();
  const { data: settings } = useQuery(SCHOOL_SETTINGS);
  const zone = settings?.schoolSettings.timezone ?? 'Asia/Tashkent';

  const [form, setForm] = useState(() => ({
    title: assignment?.title ?? '',
    instructions: assignment?.instructions ?? '',
    dueAt: assignment?.dueAt ? utcToZoned(assignment.dueAt, zone) : week?.endsAt ? `${week.endsAt}T23:59` : '',
    minutes: assignment?.timeLimitMin ?? 20,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [create] = useMutation(CREATE_ASSIGNMENT);
  const [update] = useMutation(UPDATE_ASSIGNMENT);

  const valid = form.title.trim().length > 0 && !!form.dueAt;
  const weekLabel = week?.title.split(':')[0];

  const save = async () => {
    setError(null);
    setSaving(true);
    const fields = {
      title: form.title.trim(),
      instructions: form.instructions.trim() || undefined,
      dueAt: zonedToUtc(form.dueAt, zone),
      timeLimitMin: form.minutes,
    };
    try {
      if (assignment) {
        await update({ variables: { input: { id: assignment.id, ...fields } } });
        await client.refetchQueries({ include: ['CourseAssignments'] });
        onClose();
      } else {
        // The points come from the questions; 1 is only a placeholder until they are saved
        const res = await create({ variables: { input: { courseId, type: 'QUIZ', moduleId: week?.id, maxScore: 1, ...fields } } });
        await router.push({
          pathname: '/teacher/courses/[courseId]/assignments/[assignmentId]',
          query: { courseId, assignmentId: res.data!.createAssignment.id, tab: 'questions' },
        });
      }
    } catch (err) {
      setError(errorText(errorCode(err)));
      setSaving(false);
    }
  };

  return (
    <SideDrawer
      open
      title={assignment ? t('quiz.editTitle') : weekLabel ? t('quiz.newTitle', { week: weekLabel }) : t('quiz.newTitleNoWeek')}
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
            {assignment ? t('course.save') : t('quiz.createAndWrite')}
          </Button>
        </>
      }
    >
      <DrawerSection title={t('course.lesson.basics')}>
        <FormField
          id="quiz-title"
          label={t('course.homework.title')}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          fullWidth
          size="small"
          slotProps={{ htmlInput: { maxLength: 150 } }}
        />
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 }}>
            {t('course.homework.instructions')}
          </Typography>
          <MarkdownField
            value={form.instructions}
            onChange={(instructions) => setForm((f) => ({ ...f, instructions }))}
            label={t('course.homework.instructions')}
            placeholder={t('quiz.instructionsHint')}
            maxLength={20_000}
          />
        </Box>
      </DrawerSection>

      <DrawerSection title={t('quiz.timing')}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <FormField
              id="quiz-due"
              label={t('course.homework.due')}
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              required
              fullWidth
              size="small"
              helperText={t('course.homework.zone', { zone: zone.split('/').pop()?.replace('_', ' ') })}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <TextField
              select
              id="quiz-minutes"
              label={t('quiz.timeLimit')}
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}
              fullWidth
              size="small"
            >
              {MINUTES.map((m) => (
                <MenuItem key={m} value={m}>
                  {t('quiz.minutes', { count: m })}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Stack>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('quiz.rulesHint')}</Typography>
      </DrawerSection>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </SideDrawer>
  );
}
