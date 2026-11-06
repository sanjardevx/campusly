import Head from 'next/head';
import NextLink from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { LOGO_FONT, LogoMark } from '@/libs/components/Logo';

/**
 * The 404 and 500 pages: the logo's arch, the code in the logo's serif, one sentence and two ways
 * out (the website, the portal sign-in). Static pages, so they work even when the API is down.
 */
export function ErrorPage({ code }: { code: 404 | 500 }) {
  const { t } = useTranslation('common');
  const key = code === 404 ? 'notFound' : 'server';
  return (
    <>
      <Head>
        <title>{`${t(`errorPage.${key}.title`)} · Campusly`}</title>
      </Head>
      <Box component="main" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, py: 6, bgcolor: 'background.default' }}>
        <Stack sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 440 }}>
          <Box sx={{ width: 88, height: 88 }}>
            <LogoMark />
          </Box>
          <Typography sx={{ mt: 2, fontFamily: LOGO_FONT, fontSize: '3.5rem', lineHeight: 1, letterSpacing: '0.12em', color: 'primary.main' }}>
            {code}
          </Typography>
          <Typography component="h1" sx={{ mt: 2, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
            {t(`errorPage.${key}.title`)}
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>{t(`errorPage.${key}.text`)}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ mt: 4, gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
            <Button component={NextLink} href="/" variant="contained" size="large">
              {t('errorPage.home')}
            </Button>
            <Button component={NextLink} href="/login" variant="outlined" size="large">
              {t('errorPage.signIn')}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </>
  );
}
