import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { PARENT_HOME } from '@/apollo/parent/query';
import { MY_CHILDREN } from '@/apollo/user/query';
import { layoutFor } from '@/libs/components/layout';
import { ParentHome } from '@/libs/components/parent/ParentHome';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['parent']);

/** Parent home: the child comes from ?child= (the top-bar switcher puts the first child there) */
const Home: NextPageWithLayout = () => {
  const { t } = useTranslation('parent');
  const errorText = useErrorText();
  const router = useRouter();
  const { data: kids } = useQuery(MY_CHILDREN);
  const child = typeof router.query.child === 'string' ? router.query.child : undefined;
  const { data, previousData, error } = useQuery(PARENT_HOME, { variables: { studentId: child ?? '' }, skip: !child, fetchPolicy: 'cache-and-network' });
  const home = data ?? previousData;

  if (kids && kids.myChildren.length === 0) {
    return (
      <Card variant="outlined" sx={{ borderRadius: '12px', p: 4, textAlign: 'center', maxWidth: 560, mx: 'auto' }}>
        <Typography color="text.secondary">{t('home.noChildren')}</Typography>
      </Card>
    );
  }
  if (error) return <Alert severity="error">{errorText(errorCode(error))}</Alert>;
  if (!home || !child) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  return <ParentHome data={home} child={child} />;
};

Home.getLayout = layoutFor('PARENT');
export default Home;
