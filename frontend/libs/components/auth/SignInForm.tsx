import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Button, Collapse, Link, Stack, Typography } from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import { useTranslation } from 'next-i18next/pages';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { logIn } from '@/libs/auth';
import { afterSignIn } from '@/libs/auth/routes';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { FormField } from './FormField';
import { PhonePrefix } from '@/libs/components/PhonePrefix';
import { phonesOf, telHref } from '@/libs/phones';
import { PasswordInput } from './PasswordInput';

export type SignInMode = 'student' | 'parent' | 'staff';

/** Parent login ID = the last 9 digits of the phone (DECISIONS §6): "+998 90 123-45-67" → "901234567" */
const parentLoginId = (phone: string) => phone.replace(/\D/g, '').slice(-9);

export function SignInForm({ mode }: { mode: SignInMode }) {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const errorText = useErrorText();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  // Public query: the school's office contact, set in Settings (only fetched once the hint is open)
  const school = useQuery(SCHOOL_SETTINGS, { skip: !showForgot }).data?.schoolSettings;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    const loginId = mode === 'parent' ? parentLoginId(identifier) : identifier.trim();
    if (mode === 'parent' && loginId.length !== 9) {
      setFieldError(t('signIn.phoneInvalid'));
      return;
    }
    if (!loginId) {
      setFieldError(t('signIn.required'));
      return;
    }

    setBusy(true);
    try {
      const user = await logIn(loginId, password);
      await router.replace(afterSignIn(user, router.query.next));
    } catch (err) {
      // The code is stored, not the text: switching the language translates it again
      setError(errorCode(err));
      setBusy(false);
    }
  };

  const field = {
    student: { label: t('signIn.studentId'), placeholder: t('signIn.studentIdPlaceholder') },
    parent: { label: t('signIn.phone'), placeholder: t('signIn.phonePlaceholder') },
    staff: { label: t('signIn.staffId'), placeholder: t('signIn.staffIdPlaceholder') },
  }[mode];

  return (
    <Stack
      component="form"
      spacing={{ xs: 3, md: 2 }}
      onSubmit={submit}
      noValidate
      sx={{
        // Phones (Stitch mobile): 48 px fields and button with 12 px corners, easy to tap
        '& .MuiOutlinedInput-root': { borderRadius: { xs: '12px', md: '8px' } },
        '& .MuiOutlinedInput-input': { py: { xs: '13.5px', md: '10px' } },
        '& button[type=submit]': { height: { xs: 48, md: 42 }, borderRadius: { xs: '12px', md: '8px' } },
      }}
    >
      <FormField
        id="identifier"
        label={field.label}
        placeholder={field.placeholder}
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        autoComplete="username"
        inputMode={mode === 'staff' ? 'text' : 'numeric'}
        error={!!fieldError}
        helperText={fieldError ?? undefined}
        slotProps={
          mode === 'parent'
            ? { input: { startAdornment: <PhonePrefix /> } }
            : undefined
        }
      />
      <PasswordInput
        id="password"
        label={t('signIn.password')}
        placeholder={t('signIn.passwordPlaceholder')}
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        action={
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={() => setShowForgot((v) => !v)}
            sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}
          >
            {t('signIn.forgot')}
          </Link>
        }
      />
      {/* Students and parents with Telegram connected reset it with the bot (/reset); others ask the office */}
      <Collapse in={showForgot}>
        <Alert severity="info" icon={false}>
          {t('signIn.forgotHint')}
          {(school?.contactPhone || school?.officeHours) && (
            <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 600 }}>
              {/* The first number when Settings holds several */}
              {phonesOf(school.contactPhone)[0] && (
                <Link href={telHref(phonesOf(school.contactPhone)[0])} underline="hover">
                  {t('signIn.forgotCall', { phone: phonesOf(school.contactPhone)[0] })}
                </Link>
              )}
              {school.contactPhone && school.officeHours && ' · '}
              {school.officeHours}
            </Typography>
          )}
          {school?.telegramBotUrl && (
            // The password-reset bot (the channel belongs to the public site). Only https://t.me/…bot
            // can be saved (server DTO), so this never leads to another site
            <Button
              size="small"
              variant="outlined"
              href={school.telegramBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<TelegramIcon />}
              sx={{ mt: 1 }}
            >
              {t('signIn.forgotTelegram')}
            </Button>
          )}
        </Alert>
      </Collapse>
      {error && (
        <Alert severity="error" role="alert">
          {errorText(error)}
        </Alert>
      )}
      <Box sx={{ pt: 1 }}>
        <Button type="submit" variant="contained" size="large" fullWidth disabled={busy}>
          {t('signIn.submit')}
        </Button>
      </Box>
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textAlign: 'center' }}>
        {mode === 'staff' ? t('signIn.teacherNoAccount') : t('signIn.noAccount')}
      </Typography>
    </Stack>
  );
}
