import { useEffect, useState, type ReactNode } from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useQuery, useReactiveVar } from '@apollo/client/react';
import { Alert, Box, Button, Card, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import CoPresentOutlinedIcon from '@mui/icons-material/CoPresentOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import FamilyRestroomOutlinedIcon from '@mui/icons-material/FamilyRestroomOutlined';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import OndemandVideoOutlinedIcon from '@mui/icons-material/OndemandVideoOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import { useTranslation } from 'next-i18next/pages';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { sessionReadyVar, userVar } from '@/apollo/store';
import { LanguageSwitcher } from '@/libs/components/LanguageSwitcher';
import { fadeUp } from '@/libs/components/dashboard/motion';
import { pressSx } from '@/libs/components/student/home/parts';
import { DEMO_MODE } from '@/libs/config';
import { logInDemo } from '@/libs/auth';
import { AuthError } from '@/libs/auth/api';
import { afterSignIn, homeFor } from '@/libs/auth/routes';
import type { Role } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { withTranslations } from '@/libs/i18n/server';

export const getStaticProps = withTranslations(['landing']);

/** Page container width: the usual 1200–1300 px for a marketing page on wide screens */
const CONTAINER = 1300;

// No admin demo (DECISIONS §12, demo v2): the admin console holds the school's real content
const DEMOS: { role: Role; icon: SvgIconComponent }[] = [
  { role: 'STUDENT', icon: SchoolOutlinedIcon },
  { role: 'PARENT', icon: FamilyRestroomOutlinedIcon },
  { role: 'TEACHER', icon: CoPresentOutlinedIcon },
];

const FEATURES: { key: string; icon: SvgIconComponent }[] = [
  { key: 'lessons', icon: OndemandVideoOutlinedIcon },
  { key: 'homework', icon: AssignmentTurnedInOutlinedIcon },
  { key: 'progress', icon: EventAvailableOutlinedIcon },
  { key: 'parents', icon: FamilyRestroomOutlinedIcon },
];

/**
 * The portal's front door at /portal (DECISIONS §12; the public school website took / on day 19):
 * what the portal is, the two sign-in doors and, on the demo server only, one "Demo login" per role.
 * A signed-in visitor goes straight to their own home.
 */
export default function Portal() {
  const { t } = useTranslation('landing');
  const errorText = useErrorText();
  const router = useRouter();
  const user = useReactiveVar(userVar);
  const ready = useReactiveVar(sessionReadyVar);
  const [busy, setBusy] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) void router.replace(afterSignIn(user, null));
  }, [ready, user, router]);

  const openDemo = async (role: Role) => {
    setBusy(role);
    setError(null);
    try {
      const signedIn = await logInDemo(role);
      await router.push(homeFor(signedIn.role));
    } catch (err) {
      setError(errorText(err instanceof AuthError ? err.code : undefined));
      setBusy(null);
    }
  };

  return (
    <>
      <Head>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* The demo server holds made-up data: keep it out of search results */}
        {DEMO_MODE && <meta name="robots" content="noindex" />}
      </Head>

      {/* Hero: campus photo under a spruce wash, like the public site */}
      <Box
        component="header"
        sx={{
          position: 'relative',
          color: '#fff',
          bgcolor: 'primary.main',
          backgroundImage: 'linear-gradient(90deg, rgba(31,78,67,0.94) 0%, rgba(31,78,67,0.82) 45%, rgba(31,78,67,0.45) 100%), url(/landing/campus.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Box sx={{ maxWidth: CONTAINER, mx: 'auto', px: { xs: 2, md: 4 }, pt: { xs: 2.5, md: 3.5 }, pb: { xs: 6, md: 11 } }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, border: '1px solid rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center' }}>
                <SchoolOutlinedIcon sx={{ fontSize: 22 }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.01em' }}>Campusly</Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <LanguageSwitcher tone="light" />
              <Button component={NextLink} href="/login" variant="outlined" startIcon={<LoginRoundedIcon />} sx={{ ...pressSx, display: { xs: 'none', sm: 'inline-flex' }, color: '#fff', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                {t('nav.signIn')}
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ maxWidth: 620, mt: { xs: 6, md: 10 }, ...fadeUp(0) }}>
            <Box component="span" sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 999, border: '1px solid rgba(255,255,255,0.35)', bgcolor: 'rgba(255,255,255,0.08)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {t('hero.eyebrow')}
            </Box>
            <Typography component="h1" sx={{ mt: 2.5, fontSize: { xs: '2.125rem', md: '3.25rem' }, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em' }}>
              {t('hero.title')}
            </Typography>
            <Typography sx={{ mt: 2, fontSize: { xs: '1rem', md: '1.125rem' }, color: 'rgba(255,255,255,0.85)', maxWidth: 520 }}>
              {t('hero.subtitle')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
              <Button component={NextLink} href="/login" size="large" variant="contained" disableElevation sx={{ ...pressSx, bgcolor: '#fff', color: 'primary.main', fontWeight: 700, '&:hover': { bgcolor: '#F1F2EE' } }}>
                {t('hero.studentParent')}
              </Button>
              <Button component={NextLink} href="/login/teacher" size="large" variant="outlined" endIcon={<ArrowForwardRoundedIcon />} sx={{ ...pressSx, color: '#fff', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                {t('hero.teacher')}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>

      <Box component="main" sx={{ bgcolor: 'background.default' }}>
        {DEMO_MODE && (
          <Section eyebrow={t('demo.eyebrow')} title={t('demo.title')} subtitle={t('demo.subtitle')}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
              {DEMOS.map(({ role, icon: Icon }, i) => (
                <Card key={role} variant="outlined" sx={{ borderRadius: '16px', p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.25, ...fadeUp(i + 1) }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: '#E8EFEA', color: 'primary.main' }}>
                    <Icon />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.0625rem' }}>{t(`demo.role.${role}.name`)}</Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', flex: 1 }}>{t(`demo.role.${role}.text`)}</Typography>
                  <Button variant="contained" disableElevation fullWidth disabled={busy !== null} onClick={() => void openDemo(role)} sx={pressSx}>
                    {busy === role ? t('demo.opening') : t('demo.open')}
                  </Button>
                </Card>
              ))}
            </Box>
            <Typography sx={{ mt: 2, fontSize: '0.8125rem', color: 'text.secondary' }}>{t('demo.note')}</Typography>
          </Section>
        )}

        <Section eyebrow={t('features.eyebrow')} title={t('features.title')}>
          <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 3 }, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
            {FEATURES.map(({ key, icon: Icon }) => (
              <Box key={key}>
                <Icon sx={{ color: 'secondary.main' }} />
                <Typography sx={{ mt: 1, fontWeight: 600 }}>{t(`features.${key}.title`)}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>{t(`features.${key}.text`)}</Typography>
              </Box>
            ))}
          </Box>
        </Section>
      </Box>

      <Footer />
    </>
  );
}

function Section({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ maxWidth: CONTAINER, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 5, md: 7 } }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'secondary.main' }}>{eyebrow}</Typography>
      <Typography component="h2" sx={{ mt: 0.5, fontSize: { xs: '1.5rem', md: '1.875rem' }, fontWeight: 700, letterSpacing: '-0.02em' }}>
        {title}
      </Typography>
      {subtitle && <Typography sx={{ mt: 0.75, color: 'text.secondary', maxWidth: 640 }}>{subtitle}</Typography>}
      <Box sx={{ mt: 3 }}>{children}</Box>
    </Box>
  );
}

/** School name and office phone from Settings (public query) */
function Footer() {
  const { t } = useTranslation('landing');
  const { data } = useQuery(SCHOOL_SETTINGS);
  const settings = data?.schoolSettings;
  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', bgcolor: '#fff' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ maxWidth: CONTAINER, mx: 'auto', px: { xs: 2, md: 4 }, py: 3, gap: 1, justifyContent: 'space-between', color: 'text.secondary', fontSize: '0.8125rem' }}>
        <Typography sx={{ fontSize: 'inherit' }}>{t('footer.copy', { school: settings?.schoolName ?? 'Campusly School', year: new Date().getFullYear() })}</Typography>
        {settings?.contactPhone && (
          <Typography sx={{ fontSize: 'inherit', fontVariantNumeric: 'tabular-nums' }}>
            {t('footer.office')}: {settings.contactPhone}
            {settings.officeHours ? ` · ${settings.officeHours}` : ''}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
