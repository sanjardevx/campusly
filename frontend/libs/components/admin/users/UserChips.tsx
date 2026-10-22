import { Chip, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'next-i18next/pages';
import type { PasswordState, UserStatus } from '@/libs/gql/graphql';

const STATUS_COLOR = {
  ACTIVE: { color: 'success.main', bgcolor: 'success.light' },
  BLOCKED: { color: 'error.main', bgcolor: 'error.light' },
  ARCHIVED: { color: 'info.main', bgcolor: 'info.light' },
} as const;

export function StatusChip({ status }: { status: UserStatus }) {
  const { t } = useTranslation('admin');
  return <Chip size="small" label={t(`status.${status}`)} sx={STATUS_COLOR[status]} />;
}

/** "✓ Set" in green; temporary in ochre (it runs out); expired / must change in red (cannot sign in) */
export function PasswordChip({ state, usesLeft }: { state: PasswordState; usesLeft?: number | null }) {
  const { t } = useTranslation('admin');
  if (state === 'SET') {
    return (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'success.main' }}>
        <CheckIcon sx={{ fontSize: 14 }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {t('password.SET')}
        </Typography>
      </Stack>
    );
  }
  if (state === 'TEMPORARY') {
    return (
      <Chip
        size="small"
        label={usesLeft != null ? t('password.temporaryLeft', { count: usesLeft }) : t('password.TEMPORARY')}
        sx={{ color: 'warning.dark', bgcolor: 'warning.light' }}
      />
    );
  }
  return <Chip size="small" label={t(`password.${state}`)} sx={{ color: 'error.main', bgcolor: 'error.light' }} />;
}
