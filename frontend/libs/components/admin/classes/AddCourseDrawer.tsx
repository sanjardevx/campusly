import { useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  Link,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'next-i18next/pages';
import { CREATE_COURSE } from '@/apollo/admin/mutation';
import { SUBJECTS, USERS } from '@/apollo/admin/query';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { FormField } from '@/libs/components/auth/FormField';
import { errorCode } from '@/libs/errors';
import { monoFontFamily } from '@/libs/fonts';
import { useErrorText } from '@/libs/i18n';
import { TeacherPicker } from './TeacherPicker';
import { SubjectsDialog } from './SubjectsDialog';

/**
 * Stitch "Add course" drawer: subject × the chosen class, teacher(s), whole class or a split
 * group, the school's default weights. Not here (no timetable in Campusly): lessons per week.
 */
export function AddCourseDrawer({
  group,
  courseCount,
  onClose,
  onCreated,
}: {
  group: { id: string; name: string; studentCount: number };
  courseCount: (teacherId: string) => number;
  onClose: () => void;
  onCreated: (courseId: string) => void;
}) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const client = useApolloClient();
  const subjects = (useQuery(SUBJECTS).data?.subjects ?? []).filter((s) => s.status === 'ACTIVE');
  const settings = useQuery(SCHOOL_SETTINGS).data?.schoolSettings;

  const [subjectId, setSubjectId] = useState('');
  // The name follows the subject until the admin types their own
  const [title, setTitle] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [assistant, setAssistant] = useState<string | null | undefined>(undefined);
  const [split, setSplit] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [showSubjects, setShowSubjects] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const students = useQuery(USERS, {
    skip: !split,
    variables: {
      input: { page: 1, limit: 100, sort: 'lastName', direction: 'ASC', search: { role: 'STUDENT', status: 'ACTIVE', groupId: group.id } },
    },
  });
  const subjectName = subjects.find((s) => s.id === subjectId)?.name;
  const autoTitle = subjectName ? `${subjectName} · ${group.name}` : '';
  const shownTitle = title ?? autoTitle;

  const problems = {
    subject: !subjectId,
    teacher: !owner,
    students: split && picked.size === 0,
    title: shownTitle.trim().length < 2,
  };

  const create = async () => {
    setShowErrors(true);
    if (Object.values(problems).some(Boolean)) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await client.mutate({
        mutation: CREATE_COURSE,
        variables: {
          input: {
            groupId: group.id,
            subjectId,
            title: shownTitle.trim(),
            teacherIds: assistant ? [owner!, assistant] : [owner!],
            isSplitGroup: split,
            studentIds: split ? [...picked] : undefined,
          },
        },
      });
      await client.refetchQueries({ include: ['Courses', 'Groups'] });
      onCreated(data!.createCourse.id);
    } catch (e) {
      setError(errorCode(e));
      setBusy(false);
    }
  };

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };
  const weights = settings
    ? [
        ['Homework', settings.defaultHomeworkWeight],
        ['Quizzes', settings.defaultQuizWeight],
        ['Exams', settings.defaultExamWeight],
      ]
    : [];

  return (
    <SideDrawer
      open
      title={t('classes.course.title')}
      subtitle={t('classes.course.subtitle')}
      closeLabel={t('classes.cancel')}
      onClose={onClose}
      footer={
        <Stack direction="row" spacing={1.25} sx={{ ml: 'auto' }}>
          <Button variant="outlined" onClick={onClose} disabled={busy}>
            {t('classes.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => void create()}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t('classes.course.create')}
          </Button>
        </Stack>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorText(error)}
        </Alert>
      )}
      <DrawerSection title={t('classes.course.title')}>
        <FormField
          id="course-class"
          label={t('classes.course.class')}
          value={group.name}
          disabled
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <LockOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormField
          id="course-subject"
          select
          label={t('classes.course.subject')}
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          error={showErrors && problems.subject}
          helperText={showErrors && problems.subject ? t('classes.course.required') : undefined}
          action={
            <Link component="button" type="button" onClick={() => setShowSubjects(true)} sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {t('classes.course.manageSubjects')}
            </Link>
          }
        >
          {subjects.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </FormField>
        <FormField
          id="course-name"
          label={t('classes.course.name')}
          value={shownTitle}
          onChange={(e) => setTitle(e.target.value)}
          error={showErrors && problems.title}
          helperText={t('classes.course.nameHint')}
        />

        <Box>
          <Typography component="label" htmlFor="course-teacher" sx={{ display: 'block', mb: 0.75, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
            {t('classes.course.teacher')}
          </Typography>
          <TeacherPicker
            id="course-teacher"
            value={owner}
            exclude={assistant ? [assistant] : []}
            courseCount={courseCount}
            error={showErrors && problems.teacher ? t('classes.course.pickTeacher') : undefined}
            onChange={setOwner}
          />
          {assistant === undefined ? (
            <Link
              component="button"
              type="button"
              onClick={() => setAssistant(null)}
              sx={{ mt: 1, display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.8125rem', fontWeight: 600 }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
              {t('classes.course.addSecond')}
            </Link>
          ) : (
            <Box sx={{ mt: 1.5 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>
                  {t('classes.course.second')}
                </Typography>
                <Link component="button" type="button" onClick={() => setAssistant(undefined)} sx={{ fontSize: '0.75rem' }}>
                  {t('classes.course.remove')}
                </Link>
              </Stack>
              <TeacherPicker id="course-assistant" value={assistant} exclude={owner ? [owner] : []} courseCount={courseCount} onChange={setAssistant} />
            </Box>
          )}
        </Box>

        <Box>
          <Typography sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
            {t('classes.course.students')}
          </Typography>
          <RadioGroup value={split ? 'choose' : 'all'} onChange={(e) => setSplit(e.target.value === 'choose')}>
            <FormControlLabel value="all" control={<Radio size="small" />} label={t('classes.course.all', { name: group.name, count: group.studentCount })} />
            <FormControlLabel value="choose" control={<Radio size="small" />} label={t('classes.course.choose')} />
          </RadioGroup>
          {split ? (
            <Box sx={{ mt: 1, border: 1, borderColor: showErrors && problems.students ? 'error.main' : 'divider', borderRadius: 2, maxHeight: 240, overflowY: 'auto', px: 1.5, py: 0.5 }}>
              {(students.data?.users.list ?? []).map((s) => (
                <FormControlLabel
                  key={s.id}
                  sx={{ display: 'flex' }}
                  control={<Checkbox size="small" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />}
                  label={
                    <span>
                      {s.firstName} {s.lastName}{' '}
                      <Box component="span" sx={{ fontFamily: monoFontFamily, fontSize: '0.75rem', color: 'text.secondary' }}>
                        {s.loginId}
                      </Box>
                    </span>
                  }
                />
              ))}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
              {t('classes.course.hint', { name: group.name })}
            </Typography>
          )}
          {split && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: showErrors && problems.students ? 'error.main' : 'text.secondary', fontWeight: 400 }}>
              {showErrors && problems.students ? t('classes.course.pickAtLeastOne') : t('classes.course.picked', { count: picked.size })}
            </Typography>
          )}
        </Box>

        <Box>
          <Typography sx={{ mb: 0.75, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
            {t('classes.course.grading')}
          </Typography>
          <Box sx={{ bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {weights.map(([name, weight]) => (
                <Box key={name} sx={{ fontFamily: monoFontFamily, fontSize: '0.8125rem', bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, px: 1.25, py: 0.5 }}>
                  {t(`classes.category.${name}`)} {weight}%
                </Box>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 400 }}>
              {t('classes.course.gradingHint')}
            </Typography>
          </Box>
        </Box>
      </DrawerSection>
      {showSubjects && <SubjectsDialog onClose={() => setShowSubjects(false)} />}
    </SideDrawer>
  );
}
