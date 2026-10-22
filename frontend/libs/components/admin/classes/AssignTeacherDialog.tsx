import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { SET_COURSE_TEACHERS } from '@/apollo/admin/mutation';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { TeacherPicker } from './TeacherPicker';

/** "No teacher · Assign": the picked teacher becomes the course OWNER */
export function AssignTeacherDialog({
  course,
  courseCount,
  onClose,
}: {
  course: { id: string; title: string };
  courseCount: (teacherId: string) => number;
  onClose: () => void;
}) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const client = useApolloClient();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!teacherId) return;
    setBusy(true);
    setError(null);
    try {
      await client.mutate({ mutation: SET_COURSE_TEACHERS, variables: { input: { courseId: course.id, teacherIds: [teacherId] } } });
      await client.refetchQueries({ include: ['Courses'] });
      onClose();
    } catch (e) {
      setError(errorCode(e));
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('classes.assignTitle')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorText(error)}
          </Alert>
        )}
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t('classes.assignBody', { course: course.title })}
        </Typography>
        <TeacherPicker id="assign-teacher" value={teacherId} courseCount={courseCount} onChange={setTeacherId} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" onClick={onClose} disabled={busy}>
          {t('classes.cancel')}
        </Button>
        <Button variant="contained" onClick={() => void save()} disabled={busy || !teacherId}>
          {t('classes.assign')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
