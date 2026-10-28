import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, ListSubheader, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'next-i18next/pages';
import { ASK_QUESTION } from '@/apollo/qa/mutation';
import { SideDrawer } from '@/libs/components/admin/SideDrawer';
import { FormField } from '@/libs/components/auth/FormField';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';

/** "lesson:<id>" · "assignment:<id>" · "" (the course in general) */
export type About = string;

const LABEL = { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 } as const;

/**
 * Stitch "Ask a question" drawer: title, what it is about (a lesson or assignment of this course
 * helps the teacher), optional details, "Private". The server checks the lesson / assignment
 * belongs to this course and is visible to the student.
 */
export function AskDrawer({
  courseId,
  lessons,
  assignments,
  initialAbout,
  onClose,
  onAsked,
}: {
  courseId: string;
  lessons: { id: string; title: string; week: string }[];
  assignments: { id: string; title: string }[];
  initialAbout: About;
  onClose: () => void;
  onAsked: (questionId: string) => void;
}) {
  const { t } = useTranslation('qa');
  const errorText = useErrorText();
  const [title, setTitle] = useState('');
  const [about, setAbout] = useState<About>(initialAbout);
  const [body, setBody] = useState('');
  const [isPrivate, setPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ask, { loading }] = useMutation(ASK_QUESTION, { refetchQueries: ['CourseQuestions'] });
  const valid = title.trim().length >= 3;

  const submit = async () => {
    setError(null);
    const [kind, id] = about.split(':');
    try {
      const { data } = await ask({
        variables: {
          input: {
            courseId,
            title: title.trim(),
            body: body.trim() || undefined,
            lessonId: kind === 'lesson' ? id : undefined,
            assignmentId: kind === 'assignment' ? id : undefined,
            isPrivate,
          },
        },
      });
      if (data) onAsked(data.askQuestion.id);
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  // Lessons grouped under their week, then the assignments
  const weeks = [...new Set(lessons.map((l) => l.week))];

  return (
    <SideDrawer
      open
      title={t('drawer.title')}
      closeLabel={t('drawer.cancel')}
      onClose={onClose}
      footer={
        <>
          <Button color="inherit" onClick={onClose}>
            {t('drawer.cancel')}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={() => void submit()}
            disabled={!valid || loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ ml: 'auto' }}
          >
            {t('drawer.post')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        <FormField
          id="qa-title"
          label={t('drawer.questionTitle')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
          size="small"
          placeholder={t('drawer.titleHint')}
          slotProps={{ htmlInput: { maxLength: 150 } }}
        />
        <Box>
          <Typography component="label" htmlFor="qa-about" sx={{ ...LABEL, display: 'block' }}>
            {t('drawer.about')}
          </Typography>
          <Select id="qa-about" size="small" fullWidth value={about} onChange={(e) => setAbout(e.target.value)} displayEmpty MenuProps={{ slotProps: { paper: { sx: { maxHeight: 360 } } } }}>
            <MenuItem value="">{t('drawer.general')}</MenuItem>
            {weeks.flatMap((week) => [
              <ListSubheader key={`w-${week}`}>{week}</ListSubheader>,
              ...lessons
                .filter((l) => l.week === week)
                .map((l) => (
                  <MenuItem key={l.id} value={`lesson:${l.id}`}>
                    {t('about.lesson', { title: l.title })}
                  </MenuItem>
                )),
            ])}
            {assignments.length > 0 && <ListSubheader>{t('drawer.assignments')}</ListSubheader>}
            {assignments.map((a) => (
              <MenuItem key={a.id} value={`assignment:${a.id}`}>
                {a.title}
              </MenuItem>
            ))}
          </Select>
          <Typography sx={{ mt: 0.75, fontSize: '0.75rem', color: 'text.secondary' }}>{t('drawer.aboutHint')}</Typography>
        </Box>
        <Box>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography component="label" htmlFor="qa-body" sx={LABEL}>
              {t('drawer.details')}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>{t('drawer.optional')}</Typography>
          </Stack>
          <TextField
            id="qa-body"
            multiline
            minRows={5}
            fullWidth
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('drawer.detailsHint')}
            slotProps={{ htmlInput: { maxLength: 5000 } }}
          />
        </Box>
        <FormControlLabel
          sx={{ mx: 0, alignItems: 'flex-start', gap: 1, p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.default' }}
          control={<Checkbox size="small" checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)} sx={{ p: 0.25 }} />}
          label={
            <Box>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
                <LockOutlinedIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('drawer.private')}</Typography>
              </Stack>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>{t('drawer.privateHint')}</Typography>
            </Box>
          }
        />
        <Stack direction="row" sx={{ gap: 1, p: 1.5, borderRadius: 2, bgcolor: 'success.light', color: 'success.main' }}>
          <InfoOutlinedIcon sx={{ fontSize: 18, mt: 0.125 }} />
          <Typography sx={{ fontSize: '0.8125rem' }}>{t('drawer.respect')}</Typography>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </SideDrawer>
  );
}
