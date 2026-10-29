import { useEffect } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client/react';
import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarViewWeekOutlinedIcon from '@mui/icons-material/CalendarViewWeekOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import { useTranslation } from 'next-i18next/pages';
import { sessionReadyVar, userVar } from '@/apollo/store';
import { afterSignIn } from '@/libs/auth/routes';
import { AuthLayout } from '@/libs/components/auth/AuthLayout';
import { SignInForm } from '@/libs/components/auth/SignInForm';
import { DEMO_MODE } from '@/libs/config';
import { withTranslations } from '@/libs/i18n/server';

export const getStaticProps = withTranslations(['auth']);

const icon = { fontSize: 18 };

/** Stitch "Teacher Portal Sign in" (admins sign in here too) */
export default function TeacherSignIn() {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const user = useReactiveVar(userVar);
  const ready = useReactiveVar(sessionReadyVar);

  useEffect(() => {
    // Same target as the form: the form and this effect both react to the new user, so they must agree
    if (ready && user) void router.replace(afterSignIn(user, router.query.next));
  }, [ready, user, router]);

  return (
    <AuthLayout
      portal="teacher"
      title={t('portal.teacher.badge')}
      features={[
        { icon: <CalendarViewWeekOutlinedIcon sx={icon} />, text: t('portal.teacher.f1') },
        { icon: <TableChartOutlinedIcon sx={icon} />, text: t('portal.teacher.f2') },
        { icon: <FactCheckOutlinedIcon sx={icon} />, text: t('portal.teacher.f3') },
      ]}
    >
      <Box sx={{ mb: 3 }}>
        <Chip
          label={t('portal.teacher.badge')}
          size="small"
          sx={{ bgcolor: 'primary.light', color: 'primary.main', textTransform: 'uppercase', borderRadius: 1, mb: 1.5 }}
        />
        <Typography variant="h3" component="h1">{t('signIn.title')}</Typography>
        <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>{t('signIn.teacherSubtitle')}</Typography>
      </Box>

      <SignInForm mode="staff" />

      {/* The teacher demo is on the main sign-in page with the other three */}
      {DEMO_MODE && (
        <Link component={NextLink} href="/login?demo=teacher" underline="hover" sx={{ mt: 2.5, display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem', fontWeight: 600 }}>
          <PlayCircleOutlineRoundedIcon sx={{ fontSize: 18 }} /> {t('demo.teacherLink', { ns: 'common' })}
        </Link>
      )}

      <Stack
        direction="row"
        spacing={0.75}
        sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'center' }}
      >
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('signIn.studentQuestion')}</Typography>
        <Link component={NextLink} href="/login" sx={{ fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
          {t('signIn.signInHere')} <ArrowForwardIcon sx={{ fontSize: 14 }} />
        </Link>
      </Stack>
    </AuthLayout>
  );
}
