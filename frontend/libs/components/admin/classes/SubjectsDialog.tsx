import { useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import CheckIcon from '@mui/icons-material/Check';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import { useTranslation } from 'next-i18next/pages';
import { CREATE_SUBJECT, UPDATE_SUBJECT } from '@/apollo/admin/mutation';
import { SUBJECTS } from '@/apollo/admin/query';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';

/** "Manage subjects" from the Add course drawer: add, rename, archive (subjects are a table: §5) */
export function SubjectsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const client = useApolloClient();
  const { data } = useQuery(SUBJECTS, { variables: { includeArchived: true } });
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (change: () => Promise<unknown>) => {
    setError(null);
    try {
      await change();
      await client.refetchQueries({ include: ['Subjects', 'Courses'] });
    } catch (e) {
      setError(errorCode(e));
    }
  };

  const add = () =>
    run(async () => {
      await client.mutate({ mutation: CREATE_SUBJECT, variables: { input: { name: name.trim() } } });
      setName('');
    });

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('classes.subjects.title')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorText(error)}
          </Alert>
        )}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <TextField
            value={name}
            placeholder={t('classes.subjects.placeholder')}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim().length >= 2 && void add()}
          />
          <Button variant="contained" disabled={name.trim().length < 2} onClick={() => void add()} sx={{ flexShrink: 0 }}>
            {t('classes.subjects.add')}
          </Button>
        </Stack>
        <List dense sx={{ maxHeight: 320, overflowY: 'auto' }}>
          {(data?.subjects ?? []).map((s) => (
            <ListItem
              key={s.id}
              divider
              secondaryAction={
                editing?.id === s.id ? (
                  <IconButton
                    edge="end"
                    aria-label={t('classes.save')}
                    onClick={() =>
                      void run(async () => {
                        await client.mutate({ mutation: UPDATE_SUBJECT, variables: { input: { id: s.id, name: editing.name.trim() } } });
                        setEditing(null);
                      })
                    }
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                ) : (
                  <Stack direction="row">
                    <Tooltip title={t('classes.subjects.rename')}>
                      <IconButton aria-label={t('classes.subjects.rename')} onClick={() => setEditing({ id: s.id, name: s.name })}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={s.status === 'ARCHIVED' ? t('classes.subjects.restore') : t('classes.subjects.archive')}>
                      <IconButton
                        edge="end"
                        aria-label={s.status === 'ARCHIVED' ? t('classes.subjects.restore') : t('classes.subjects.archive')}
                        onClick={() =>
                          void run(() =>
                            client.mutate({
                              mutation: UPDATE_SUBJECT,
                              variables: { input: { id: s.id, status: s.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' } },
                            }),
                          )
                        }
                      >
                        {s.status === 'ARCHIVED' ? <UnarchiveOutlinedIcon fontSize="small" /> : <ArchiveOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )
              }
            >
              {editing?.id === s.id ? (
                <TextField
                  value={editing.name}
                  autoFocus
                  onChange={(e) => setEditing({ id: s.id, name: e.target.value })}
                  sx={{ mr: 6 }}
                />
              ) : (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: s.status === 'ARCHIVED' ? 'text.disabled' : 'text.primary' }}>
                  <span>{s.name}</span>
                  {s.status === 'ARCHIVED' && <Chip size="small" label={t('classes.subjects.archived')} />}
                </Stack>
              )}
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="contained" onClick={onClose}>
          {t('classes.subjects.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
