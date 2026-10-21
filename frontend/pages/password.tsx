import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient, useReactiveVar } from '@apollo/client/react';
import { Alert, AlertTitle, Avatar, Box, Button, Link, Stack, Typography } from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import FamilyRestroomOutlinedIcon from '@mui/icons-material/FamilyRestroomOutlined';
import LockClockOutlinedIcon from '@mui/icons-material/LockClockOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useTranslation } from 'next-i18next/pages';
import { sessionReadyVar, userVar } from '@/apollo/store';
import { changePassword, getPendingPassword, logOut } from '@/libs/auth';
import { homeFor } from '@/libs/auth/routes';
import { AuthLayout } from '@/libs/components/auth/AuthLayout';
import { PasswordInput } from '@/libs/components/auth/PasswordInput';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { withTranslations } from '@/libs/i18n/server';

export const getStaticProps = withTranslations(['auth']);

const RULES = [
  { key: 'ruleLength', test: (p: string) => p.length >= 8 },
  { key: 'ruleUpper', test: (p: string) => /[A-ZА-ЯЁ]/.test(p) },
  { key: 'ruleNumber', test: (p: string) => /\d/.test(p) },
  { key: 'ruleSymbol', test: (p: string) => /[^\p{L}\p{N}]/u.test(p) },
] as const;
const LEVELS = ['weak', 'weak', 'fair', 'good', 'strong'] as const;

/**
 * Stitch "Set a New Password". Required: 8+ characters (what the backend checks); the other
 * rules only raise the strength meter. Forced (temporary password used up) or voluntary.
 */
export default function SetPassword() {
  const router = useRouter();
  const client = useApolloClient();
  const { t } = useTranslation('auth');
  const errorText = useErrorText();
  const user = useReactiveVar(userVar);
  const ready = useReactiveVar(sessionReadyVar);

  // Typed at sign-in a moment ago (memory only). After a reload it is gone: then we ask for it.
  const [pending] = useState(getPendingPassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && !user) void router.replace({ pathname: '/login', query: { next: '/password' } });
  }, [ready, user, router]);

  if (!user) return null;

  const passed = RULES.filter((r) => r.test(next)).length;
  const level = LEVELS[passed];
  const forced = user.mustChangePassword;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProblem(null);
    if (next.length < 8) return setProblem(t('password.tooShort'));
    if (next !== confirm) return setProblem(t('password.mismatch'));

    setBusy(true);
    try {
      await changePassword(client, pending ?? current, next);
      await router.replace(homeFor(user.role));
    } catch (err) {
      setError(errorCode(err));
      setBusy(false);
    }
  };

  const signOut = async () => {
    await logOut(client);
    await router.replace('/login');
  };

  const icon = { fontSize: 18 };
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`;

  return (
    <AuthLayout
      dense
      portal={user.role === 'TEACHER' || user.role === 'ADMIN' ? 'teacher' : 'student'}
      title={t('password.title')}
      features={[
        { icon: <CalendarTodayOutlinedIcon sx={icon} />, text: t('portal.student.f1') },
        { icon: <FactCheckOutlinedIcon sx={icon} />, text: t('portal.student.f2') },
        { icon: <FamilyRestroomOutlinedIcon sx={icon} />, text: t('portal.student.f3') },
      ]}
    >
      {/* Who is signed in, with a way out if it is the wrong person */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', px: 1.25, py: 1, mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: 'primary.main' }}>{initials}</Avatar>
        <Typography sx={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600 }}>
          {user.firstName} {user.lastName}{' '}
          <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>· ID {user.loginId}</Box>
        </Typography>
        <Link component="button" type="button" onClick={() => void signOut()} underline="hover" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          {t('password.notYou')} {t('password.signOut')}
        </Link>
      </Stack>

      <Alert severity="warning" icon={<LockClockOutlinedIcon />} sx={{ mb: 1.5, py: 0.25 }}>
        <AlertTitle sx={{ fontWeight: 600 }}>{forced ? t('password.forcedTitle') : t('password.voluntaryTitle')}</AlertTitle>
        {forced ? t('password.forcedBody') : t('password.voluntaryBody')}
      </Alert>

      <Box sx={{ mb: 2 }}>
        <Typography variant="h3" component="h1">{t('password.title')}</Typography>
        <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>{t('password.subtitle')}</Typography>
      </Box>

      <Stack component="form" spacing={1.25} onSubmit={submit} noValidate>
        {!pending && (
          <PasswordInput id="current" label={t('password.current')} value={current} onChange={setCurrent} autoComplete="current-password" />
        )}
        <Box>
          <PasswordInput id="new" label={t('password.new')} value={next} onChange={setNext} autoComplete="new-password" />
          {/* Strength meter: four segments in sage */}
          <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
            {[1, 2, 3, 4].map((i) => (
              <Box key={i} sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: i <= passed ? 'secondary.main' : 'divider' }} />
            ))}
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{t('password.strength')}</Typography>
            {next && <Typography variant="caption" color="secondary.main">{t(`password.${level}`)}</Typography>}
          </Stack>
        </Box>
        <PasswordInput id="confirm" label={t('password.confirm')} value={confirm} onChange={setConfirm} autoComplete="new-password" error={problem} />

        {/* Two columns on wider screens: the page fits without scrolling */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 0.75,
            px: 1.5,
            py: 1.25,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          {RULES.map((r) => {
            const ok = r.test(next);
            return (
              <Stack key={r.key} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {ok ? <CheckCircleIcon color="success" sx={{ fontSize: 16 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                <Typography variant="body2" sx={{ color: ok ? 'text.primary' : 'text.secondary' }}>{t(`password.${r.key}`)}</Typography>
              </Stack>
            );
          })}
        </Box>

        {error && <Alert severity="error" role="alert">{errorText(error)}</Alert>}
        <Button type="submit" variant="contained" size="large" fullWidth disabled={busy}>
          {t('password.save')}
        </Button>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textAlign: 'center' }}>{t('password.help')}</Typography>
      </Stack>
    </AuthLayout>
  );
}
