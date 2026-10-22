import type { ReactNode } from 'react';
import { Alert, Box, Button, Card, CircularProgress, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useTranslation } from 'next-i18next/pages';
import { useErrorText } from '@/libs/i18n';

export interface CardEdit {
  editing: boolean;
  onEdit: () => void;
  /** Throw away the changes: the card puts the saved values back */
  onCancel: () => void;
  dirty: boolean;
  valid: boolean;
  busy: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
}

/**
 * One settings section. Values are read-only until "Edit" (settings change rarely; a stray click
 * must not change a mark threshold); then Cancel / Save. Save sends only this card's fields.
 */
export function SettingsCard({
  title,
  subtitle,
  action,
  children,
  edit,
}: {
  title: string;
  subtitle: string;
  /** A header button for cards without the edit mode (e.g. "Add year") */
  action?: ReactNode;
  children: ReactNode;
  edit?: CardEdit;
}) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  return (
    <Card>
      <Stack direction="row" sx={{ px: 3, pt: 2.5, pb: 2, justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h2">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>
        {action}
        {edit && !edit.editing && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
            {edit.saved && (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'success.main' }}>
                <CheckIcon fontSize="small" />
                <Typography variant="body2">{t('settings.saved')}</Typography>
              </Stack>
            )}
            <Button variant="outlined" size="small" startIcon={<EditOutlinedIcon />} onClick={edit.onEdit}>
              {t('settings.edit')}
            </Button>
          </Stack>
        )}
      </Stack>
      <Box
        sx={{
          px: 3,
          pb: 3,
          // Read-only fields keep normal text colour (MUI greys disabled text out)
          ...(edit &&
            !edit.editing && {
              '& .Mui-disabled': { color: 'text.primary', WebkitTextFillColor: 'currentColor' },
              '& .MuiOutlinedInput-root.Mui-disabled': { bgcolor: 'background.default' },
              '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
              '& .MuiInputAdornment-root': { color: 'text.secondary' },
            }),
        }}
      >
        {children}
      </Box>
      {edit?.editing && (
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ px: 3, py: 1.75, borderTop: 1, borderColor: 'divider', alignItems: 'center', justifyContent: 'flex-end', bgcolor: 'background.default' }}
        >
          {edit.error && (
            <Alert severity="error" sx={{ py: 0, mr: 'auto' }}>
              {errorText(edit.error)}
            </Alert>
          )}
          <Button variant="outlined" onClick={edit.onCancel} disabled={edit.busy}>
            {t('settings.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={!edit.dirty || !edit.valid || edit.busy}
            onClick={edit.onSave}
            startIcon={edit.busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t('settings.save')}
          </Button>
        </Stack>
      )}
    </Card>
  );
}
