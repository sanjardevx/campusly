import { useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import FamilyRestroomOutlinedIcon from '@mui/icons-material/FamilyRestroomOutlined';
import { useTranslation } from 'next-i18next/pages';
import { AuthError, resetPasswordRequest } from '@/libs/auth/api';
import { AuthLayout } from '@/libs/components/auth/AuthLayout';
import { PasswordInput } from '@/libs/components/auth/PasswordInput';
import { useErrorText } from '@/libs/i18n';
import { withTranslations } from '@/libs/i18n/server';

export const getStaticProps = withTranslations(['auth']);

/**
 * Opened from the Telegram bot's one-time link (?token=…): set a new password without signing in.
 * The token works once for 15 minutes; afterwards every session is signed out (DECISIONS §6).
 */
export default function ResetPassword() {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const errorText = useErrorText();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProblem(null);
    if (next.length < 8) return setProblem(t('password.tooShort'));
    if (next !== confirm) return setProblem(t('password.mismatch'));
    setBusy(true);
    try {
      await resetPasswordRequest(token, next);
      setDone(true);
    } catch (err) {
      setError(err instanceof AuthError ? err.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };

  const icon = { fontSize: 18 };

  return (
    <AuthLayout
      dense
      portal="student"
      title={t('reset.title')}
      features={[
        { icon: <CalendarTodayOutlinedIcon sx={icon} />, text: t('portal.student.f1') },
        { icon: <FactCheckOutlinedIcon sx={icon} />, text: t('portal.student.f2') },
        { icon: <FamilyRestroomOutlinedIcon sx={icon} />, text: t('portal.student.f3') },
      ]}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h3" component="h1">{t('reset.title')}</Typography>
        <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>{t('reset.subtitle')}</Typography>
      </Box>

      {done ? (
        <Stack spacing={1.5}>
          <Alert severity="success">{t('reset.done')}</Alert>
          <Button component={NextLink} href="/login" variant="contained" size="large" fullWidth>
            {t('reset.toSignIn')}
          </Button>
        </Stack>
      ) : router.isReady && !token ? (
        <Alert severity="warning">{t('reset.noToken')}</Alert>
      ) : (
        <Stack component="form" spacing={1.25} onSubmit={submit} noValidate>
          <PasswordInput id="new" label={t('password.new')} value={next} onChange={setNext} autoComplete="new-password" />
          <PasswordInput id="confirm" label={t('password.confirm')} value={confirm} onChange={setConfirm} autoComplete="new-password" error={problem} />
          {error && (
            <Alert severity="error" role="alert">
              {errorText(error)}
              {error === 'RESET_LINK_INVALID' && ` ${t('reset.askAgain')}`}
            </Alert>
          )}
          <Button type="submit" variant="contained" size="large" fullWidth disabled={busy || !token}>
            {t('reset.save')}
          </Button>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textAlign: 'center' }}>{t('reset.note')}</Typography>
        </Stack>
      )}
    </AuthLayout>
  );
}
