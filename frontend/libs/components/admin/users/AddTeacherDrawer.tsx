import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Alert, Button, CircularProgress, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { useTranslation } from 'next-i18next/pages';
import { CREATE_TEACHER } from '@/apollo/admin/mutation';
import { CredentialCard } from '@/libs/components/admin/CredentialCard';
import { PrintableSlips, type Slip } from '@/libs/components/admin/LoginSlips';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { FormField } from '@/libs/components/auth/FormField';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';

const EMPTY = { firstName: '', lastName: '', title: '' };

/** Not in Stitch: the Add student drawer's parts for a staff account (name + title) */
export function AddTeacherDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const client = useApolloClient();
  const [form, setForm] = useState(EMPTY);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slip, setSlip] = useState<Slip | null>(null);

  const reset = () => {
    setForm(EMPTY);
    setShowErrors(false);
    setError(null);
    setSlip(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const invalid = {
    firstName: form.firstName.trim().length < 2,
    lastName: form.lastName.trim().length < 2,
  };
  const err = (key: keyof typeof invalid) =>
    showErrors && invalid[key] ? { error: true, helperText: t('add.nameLength') } : {};

  const save = async () => {
    setShowErrors(true);
    setError(null);
    if (invalid.firstName || invalid.lastName) return;
    setSaving(true);
    try {
      const { data } = await client.mutate({
        mutation: CREATE_TEACHER,
        fetchPolicy: 'no-cache',
        variables: {
          input: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), title: form.title.trim() || undefined },
        },
      });
      setSlip(data!.createTeacher);
      await client.refetchQueries({ include: ['Users', 'UserCounts'] });
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SideDrawer
      open={open}
      title={t('add.teacherTitle')}
      subtitle={t('add.teacherSubtitle')}
      closeLabel={t('add.close')}
      onClose={close}
      footer={
        <>
          <Button variant="outlined" onClick={close} disabled={saving}>
            {slip ? t('add.close') : t('add.cancel')}
          </Button>
          <Stack direction="row" spacing={1.25} sx={{ ml: 'auto' }}>
            <Button
              variant="outlined"
              startIcon={<PrintOutlinedIcon />}
              disabled={!slip}
              onClick={() => window.print()}
              sx={{ borderColor: 'primary.main', color: 'primary.main' }}
            >
              {t('add.print')}
            </Button>
            {slip ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={reset}>
                {t('add.addAnother')}
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
                disabled={saving}
                onClick={() => void save()}
              >
                {t('add.saveTeacher')}
              </Button>
            )}
          </Stack>
        </>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorText(error)}
        </Alert>
      )}
      <DrawerSection title={t('add.sectionTeacher')}>
        <Stack direction="row" spacing={1.5}>
          <FormField
            id="teacher-first"
            label={t('add.firstName')}
            value={form.firstName}
            disabled={!!slip}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            {...err('firstName')}
          />
          <FormField
            id="teacher-last"
            label={t('add.lastName')}
            value={form.lastName}
            disabled={!!slip}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            {...err('lastName')}
          />
        </Stack>
        <FormField
          id="teacher-title"
          label={t('add.title')}
          placeholder={t('add.titleHint')}
          value={form.title}
          disabled={!!slip}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        {slip && <CredentialCard slip={slip} />}
      </DrawerSection>
      {slip && <PrintableSlips slips={[slip]} />}
    </SideDrawer>
  );
}
