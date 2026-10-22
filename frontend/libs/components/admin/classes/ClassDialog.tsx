import { useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { CREATE_GROUP, UPDATE_GROUP } from '@/apollo/admin/mutation';
import { CURRENT_YEAR } from '@/apollo/app/query';
import { FormField } from '@/libs/components/auth/FormField';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';

interface ClassItem {
  id: string;
  name: string;
  status: string;
}

/**
 * Add class (no `group`) or edit one: rename, archive, restore. A class is never deleted:
 * archiving hides it from lists and pickers and keeps its history (DECISIONS §5).
 */
export function ClassDialog({
  group,
  onClose,
  onSaved,
}: {
  group?: ClassItem;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const client = useApolloClient();
  const year = useQuery(CURRENT_YEAR).data?.currentAcademicYear;
  const [name, setName] = useState(group?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (change: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    try {
      const id = await change();
      await client.refetchQueries({ include: ['Groups', 'Courses'] });
      onSaved(id);
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      if (group) {
        await client.mutate({ mutation: UPDATE_GROUP, variables: { input: { id: group.id, name: name.trim() } } });
        return group.id;
      }
      // "9a" is stored as "9A" by the server; a second "9A" in the same year is a CONFLICT
      const { data } = await client.mutate({
        mutation: CREATE_GROUP,
        variables: { input: { academicYearId: year!.id, name: name.trim() } },
      });
      return data!.createGroup.id;
    });

  const setStatus = (status: 'ACTIVE' | 'ARCHIVED') =>
    run(async () => {
      await client.mutate({ mutation: UPDATE_GROUP, variables: { input: { id: group!.id, status } } });
      return group!.id;
    });

  const valid = name.trim().length >= 1 && name.trim().length <= 20;
  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{group ? t('classes.editTitle') : t('classes.addClassTitle')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorText(error)}
          </Alert>
        )}
        <FormField
          id="class-name"
          label={t('classes.className')}
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          helperText={t('classes.classNameHint')}
          onKeyDown={(e) => e.key === 'Enter' && valid && void save()}
        />
        {group && (
          <>
            <Divider sx={{ my: 2.5 }} />
            <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
              <Typography variant="body2" color="text.secondary">
                {t('classes.archiveHint')}
              </Typography>
              {group.status === 'ARCHIVED' ? (
                <Button variant="outlined" disabled={busy} onClick={() => void setStatus('ACTIVE')}>
                  {t('classes.restore')}
                </Button>
              ) : (
                <Button variant="outlined" color="error" disabled={busy} onClick={() => void setStatus('ARCHIVED')}>
                  {t('classes.archive')}
                </Button>
              )}
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" onClick={onClose} disabled={busy}>
          {t('classes.cancel')}
        </Button>
        <Button variant="contained" onClick={() => void save()} disabled={busy || !valid || (!group && !year)}>
          {group ? t('classes.save') : t('classes.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
