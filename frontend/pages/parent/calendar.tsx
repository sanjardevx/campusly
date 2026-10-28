import { useRouter } from 'next/router';
import { Box, CircularProgress } from '@mui/material';
import { layoutFor } from '@/libs/components/layout';
import { CalendarView } from '@/libs/components/calendar/CalendarView';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['parent', 'calendar']);

/** The chosen child's calendar, read-only (studentCalendar checks the parent–child link) */
const ParentCalendar: NextPageWithLayout = () => {
  const { query } = useRouter();
  const child = typeof query.child === 'string' ? query.child : undefined;
  if (!child) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  return <CalendarView key={child} studentId={child} linkWork={false} />;
};

ParentCalendar.getLayout = layoutFor('PARENT');
export default ParentCalendar;
