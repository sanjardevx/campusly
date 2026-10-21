import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient, useReactiveVar } from '@apollo/client/react';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { sessionReadyVar, userVar } from '@/apollo/store';
import { logOut } from '@/libs/auth';
import { LanguageSwitcher } from '@/libs/components/LanguageSwitcher';
import { TempPasswordBanner } from '@/libs/components/TempPasswordBanner';

/** Step 4 placeholder for each role's home; step 5 replaces it with the real layouts and guard */
export function RoleHomePlaceholder() {
  const router = useRouter();
  const client = useApolloClient();
  const { t } = useTranslation('common');
  const user = useReactiveVar(userVar);
  const ready = useReactiveVar(sessionReadyVar);

  useEffect(() => {
    if (ready && !user) void router.replace({ pathname: '/login', query: { next: router.asPath } });
  }, [ready, user, router]);

  if (!user) return null;
  return (
    <Box component="main" sx={{ maxWidth: 720, mx: 'auto', px: 2, py: 6 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3" component="h1" color="primary">
          {t('home.welcome', { name: user.firstName })}
        </Typography>
        <LanguageSwitcher />
      </Stack>
      <Stack spacing={2}>
        <TempPasswordBanner />
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 600 }}>
              {user.firstName} {user.lastName} · {t(`roles.${user.role}`)} · {user.loginId}
            </Typography>
            <Typography color="text.secondary">{t('home.soon')}</Typography>
            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => void logOut(client).then(() => router.replace('/login'))}
            >
              {t('auth.signOut')}
            </Button>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
