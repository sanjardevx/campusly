import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CircularProgress, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { PARENT_ATTENDANCE } from '@/apollo/parent/query';
import { layoutFor } from '@/libs/components/layout';
import { AttendanceView, QuarterTabs } from '@/libs/components/parent/AttendanceView';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['parent']);

/** The chosen child's attendance, one quarter at a time (studentAttendance; the API checks the link) */
function ChildAttendance({ child }: { child: string }) {
  const { t } = useTranslation('parent');
  const errorText = useErrorText();
  const theme = useTheme();
  const phone = !useMediaQuery(theme.breakpoints.up('md'));
  // null = the current quarter (the server picks it)
  const [periodId, setPeriodId] = useState<string | null>(null);
  const { data, previousData, error } = useQuery(PARENT_ATTENDANCE, { variables: { studentId: child, periodId }, fetchPolicy: 'cache-and-network' });
  const result = (data ?? previousData)?.studentAttendance;

  if (error) return <Alert severity="error">{errorText(errorCode(error))}</Alert>;
  if (!result) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (!result.period) {
    return (
      <Card variant="outlined" sx={{ borderRadius: '12px', p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('attendance.noPeriod')}</Typography>
      </Card>
    );
  }
  const tabs = <QuarterTabs periods={result.periods} value={periodId ?? result.period.id} onChange={setPeriodId} />;
  // key: a new quarter or a switch to / from the phone layout starts with fresh filters
  return <AttendanceView key={`${result.period.id}-${phone}`} data={result} tabs={tabs} phone={phone} />;
}

const ParentAttendance: NextPageWithLayout = () => {
  const { query } = useRouter();
  const child = typeof query.child === 'string' ? query.child : undefined;
  if (!child) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  return <ChildAttendance key={child} child={child} />;
};

ParentAttendance.getLayout = layoutFor('PARENT');
export default ParentAttendance;
