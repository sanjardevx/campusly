import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client/react';
import { Box, Link, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import FamilyRestroomOutlinedIcon from '@mui/icons-material/FamilyRestroomOutlined';
import { useTranslation } from 'next-i18next/pages';
import { sessionReadyVar, userVar } from '@/apollo/store';
import { afterSignIn } from '@/libs/auth/routes';
import { AuthLayout } from '@/libs/components/auth/AuthLayout';
import { SignInForm } from '@/libs/components/auth/SignInForm';
import { withTranslations } from '@/libs/i18n/server';

export const getStaticProps = withTranslations(['auth']);

const icon = { fontSize: 18 };

/** Stitch "Student & Parent Sign In": Student | Parent segmented tabs */
export default function StudentParentSignIn() {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const user = useReactiveVar(userVar);
  const ready = useReactiveVar(sessionReadyVar);
  const [mode, setMode] = useState<'student' | 'parent'>('student');

  // Already signed in (silent refresh): straight to the right home
  useEffect(() => {
    // Same target as the form: the form and this effect both react to the new user, so they must agree
    if (ready && user) void router.replace(afterSignIn(user, router.query.next));
  }, [ready, user, router]);

  return (
    <AuthLayout
      portal="student"
      title={t('signIn.title')}
      features={[
        { icon: <CalendarTodayOutlinedIcon sx={icon} />, text: t('portal.student.f1') },
        { icon: <FactCheckOutlinedIcon sx={icon} />, text: t('portal.student.f2') },
        { icon: <FamilyRestroomOutlinedIcon sx={icon} />, text: t('portal.student.f3') },
      ]}
    >
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={mode}
          onChange={(_, value: 'student' | 'parent' | null) => value && setMode(value)}
          sx={{
            bgcolor: { xs: '#EFEEEA', md: 'grey.100' },
            p: 0.5,
            height: { xs: 44, md: 'auto' },
            borderRadius: { xs: 1.5, md: 2 },
            border: { xs: 0, md: '1px solid' },
            borderColor: { md: 'divider' },
            '& .MuiToggleButton-root': {
              border: 0,
              borderRadius: { xs: '12px !important', md: '6px !important' },
              py: { xs: 0, md: 1 },
              fontWeight: 500,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
            },
            // Stitch: the active segment is a white card with a faint shadow
            '& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover': {
              bgcolor: 'background.paper',
              color: 'text.primary',
              fontWeight: 600,
              boxShadow: 1,
            },
          }}
        >
          <ToggleButton value="student">{t('signIn.tabStudent')}</ToggleButton>
          <ToggleButton value="parent">{t('signIn.tabParent')}</ToggleButton>
        </ToggleButtonGroup>
        {/* Only on the Parent tab: how parents sign in */}
        {mode === 'parent' && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
            {t('signIn.parentHint')}
          </Typography>
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '1.625rem', md: '1.5rem' }, fontWeight: { xs: 700, md: 600 } }}>
          {t('signIn.title')}
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>{t('signIn.subtitle')}</Typography>
      </Box>

      {/* key: switching the tab starts a clean form */}
      <SignInForm key={mode} mode={mode} />

      <Stack
        direction="row"
        spacing={0.75}
        sx={{ mt: { xs: 3, md: 4 }, pt: 3, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'center', fontSize: { xs: '0.875rem', md: '0.75rem' } }}
      >
        {/* Phones: the whole line is the green link (44 px tap target in Stitch) */}
        <Typography sx={{ fontSize: 'inherit', color: { xs: 'primary.main', md: 'text.secondary' }, fontWeight: { xs: 600, md: 400 } }}>
          {t('signIn.teacherQuestion')}
        </Typography>
        <Link component={NextLink} href="/login/teacher" underline="hover" sx={{ fontSize: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
          {t('signIn.signInHere')} <ArrowForwardIcon sx={{ fontSize: 14 }} />
        </Link>
      </Stack>
    </AuthLayout>
  );
}
