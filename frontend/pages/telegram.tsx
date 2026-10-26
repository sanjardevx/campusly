import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client/react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import FamilyRestroomOutlinedIcon from '@mui/icons-material/FamilyRestroomOutlined';
import TelegramIcon from '@mui/icons-material/Telegram';
import { useTranslation } from 'next-i18next/pages';
import { sessionReadyVar, userVar } from '@/apollo/store';
import { CREATE_TELEGRAM_LINK } from '@/apollo/user/mutation';
import { TELEGRAM_STATUS } from '@/apollo/user/query';
import { homeFor } from '@/libs/auth/routes';
import { AuthLayout } from '@/libs/components/auth/AuthLayout';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { withTranslations } from '@/libs/i18n/server';

export const getStaticProps = withTranslations(['auth']);

/**
 * "Connect Telegram" (students and parents): once connected, a forgotten password is reset by
 * sending /reset to the bot. Students get a one-time link; parents share their phone in the bot.
 */
export default function ConnectTelegram() {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const errorText = useErrorText();
  const user = useReactiveVar(userVar);
  const ready = useReactiveVar(sessionReadyVar);
  const allowed = user?.role === 'STUDENT' || user?.role === 'PARENT';

  const { data, refetch } = useQuery(TELEGRAM_STATUS, { skip: !allowed, fetchPolicy: 'network-only' });
  const [createLink, link] = useMutation(CREATE_TELEGRAM_LINK);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !user) void router.replace({ pathname: '/login', query: { next: '/telegram' } });
    if (ready && user && !allowed) void router.replace(homeFor(user.role));
  }, [ready, user, allowed, router]);

  // Coming back from Telegram: show the new state without a reload
  useEffect(() => {
    const onFocus = () => void refetch();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetch]);

  if (!user || !allowed) return null;
  const status = data?.telegramStatus;
  const botUrl = status?.botUsername ? `https://t.me/${status.botUsername}` : undefined;
  const icon = { fontSize: 18 };

  const getLink = async () => {
    setError(null);
    try {
      await createLink();
    } catch (err) {
      setError(errorCode(err));
    }
  };

  return (
    <AuthLayout
      dense
      portal="student"
      title={t('telegram.title')}
      features={[
        { icon: <CalendarTodayOutlinedIcon sx={icon} />, text: t('portal.student.f1') },
        { icon: <FactCheckOutlinedIcon sx={icon} />, text: t('portal.student.f2') },
        { icon: <FamilyRestroomOutlinedIcon sx={icon} />, text: t('portal.student.f3') },
      ]}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h3" component="h1">{t('telegram.title')}</Typography>
        <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>{t('telegram.subtitle')}</Typography>
      </Box>

      <Stack spacing={1.5}>
        {status && !status.enabled && <Alert severity="info">{t('telegram.disabled')}</Alert>}

        {status?.enabled && status.linked && (
          <Alert severity="success">
            {t('telegram.linked')} {t('telegram.unlinkHint')}
          </Alert>
        )}

        {status?.enabled && !status.linked && user.role === 'STUDENT' && (
          <>
            <Typography variant="body2">{t('telegram.studentSteps')}</Typography>
            {link.data ? (
              <Button
                variant="contained"
                size="large"
                href={link.data.createTelegramLink.url}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<TelegramIcon />}
              >
                {t('telegram.open')}
              </Button>
            ) : (
              <Button variant="contained" size="large" onClick={() => void getLink()} disabled={link.loading} startIcon={<TelegramIcon />}>
                {t('telegram.createLink')}
              </Button>
            )}
            {link.data && <Typography variant="caption" color="text.secondary">{t('telegram.linkNote')}</Typography>}
          </>
        )}

        {status?.enabled && !status.linked && user.role === 'PARENT' && (
          <>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{t('telegram.parentSteps')}</Typography>
            {botUrl && (
              <Button variant="contained" size="large" href={botUrl} target="_blank" rel="noopener noreferrer" startIcon={<TelegramIcon />}>
                {t('telegram.open')}
              </Button>
            )}
          </>
        )}

        {error && <Alert severity="error" role="alert">{errorText(error)}</Alert>}
        <Button component={NextLink} href={homeFor(user.role)} variant="text">
          {t('telegram.back')}
        </Button>
      </Stack>
    </AuthLayout>
  );
}
