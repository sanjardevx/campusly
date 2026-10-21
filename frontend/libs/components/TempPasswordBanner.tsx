import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client/react';
import { Alert, Button } from '@mui/material';
import LockClockOutlinedIcon from '@mui/icons-material/LockClockOutlined';
import { useTranslation } from 'next-i18next/pages';
import { tempPasswordWarningVar } from '@/apollo/store';
import { formatDate } from '@/libs/i18n/format';

/** "Temporary password: 2 sign-ins left" while an admin-issued password is still in use */
export function TempPasswordBanner() {
  const { t } = useTranslation('auth');
  const { locale } = useRouter();
  const warning = useReactiveVar(tempPasswordWarningVar);
  if (!warning) return null;

  const date = formatDate(warning.expiresAt, locale);
  return (
    <Alert
      severity="warning"
      icon={<LockClockOutlinedIcon />}
      action={
        <Button component={NextLink} href="/password" size="small" color="warning">
          {t('banner.action')}
        </Button>
      }
    >
      {t('banner.text', { count: warning.usesLeft, date })}
    </Alert>
  );
}
