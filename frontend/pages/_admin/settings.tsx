import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { AccountsCard } from '@/libs/components/admin/settings/AccountsCard';
import { GradingCard } from '@/libs/components/admin/settings/GradingCard';
import { SchoolCard } from '@/libs/components/admin/settings/SchoolCard';
import { YearsCard } from '@/libs/components/admin/settings/YearsCard';
import { layoutFor } from '@/libs/components/layout';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['admin']);

/**
 * Settings (not in Stitch: built from the same parts). Each card saves only its own fields.
 * The cards get the loaded settings as props and keep their own form state, so a card is
 * mounted only after the settings are there (no empty form flashing into real values).
 */
const SettingsPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const settings = useQuery(SCHOOL_SETTINGS, { fetchPolicy: 'cache-and-network' }).data?.schoolSettings;

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <Stack spacing={3} sx={{ maxWidth: 880 }}>
        {settings && (
          <>
            <SchoolCard settings={settings} />
            <GradingCard settings={settings} />
            <AccountsCard settings={settings} />
          </>
        )}
        <YearsCard />
      </Stack>
    </>
  );
};

SettingsPage.getLayout = layoutFor('ADMIN');
export default SettingsPage;
