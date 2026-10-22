import { Alert, Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { monoFontFamily } from '@/libs/fonts';
import { CopyButton, type Slip } from './LoginSlips';

/**
 * Stitch's green "credentials" card under a form section: login ID and temporary password with
 * copy buttons, how the ID is built, and the 3 sign-ins / 14 days rule.
 * An existing parent has no new password: the card says the account was linked instead.
 */
export function CredentialCard({ slip }: { slip: Slip }) {
  const { t } = useTranslation(['admin', 'common']);
  const id = slip.loginId;
  const explain =
    slip.role === 'PARENT'
      ? t('add.parentIdExplain')
      : t('add.idExplain', { year: id.slice(0, 2), role: id.slice(2, 3), seq: id.slice(3) });

  const line = (label: string, value: string) => (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(31,78,67,0.1)' }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ width: 140 }}>
          {label}
        </Typography>
        <Typography sx={{ fontFamily: monoFontFamily, fontWeight: 700, letterSpacing: '0.06em' }}>{value}</Typography>
      </Stack>
      <CopyButton text={value} />
    </Stack>
  );

  return (
    <Box
      sx={{ bgcolor: 'primary.light', border: '1px solid rgba(31,78,67,0.2)', borderRadius: '10px', p: 1.75 }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        {slip.fullName} · {t(`common:roles.${slip.role}`)}
      </Typography>
      <Stack spacing={1}>
        {line(t('slips.loginId'), id)}
        {slip.tempPassword && line(t('slips.password'), slip.tempPassword)}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
          {explain}
        </Typography>
        {slip.tempPassword ? (
          <Alert severity="warning" sx={{ py: 0, fontSize: '0.75rem' }}>
            {t('add.tempNote')}
          </Alert>
        ) : (
          <Alert severity="info" sx={{ py: 0, fontSize: '0.75rem' }}>
            {t('add.existingAccount')}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
