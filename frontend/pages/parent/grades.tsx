import { useRouter } from 'next/router';
import { Box, CircularProgress } from '@mui/material';
import { layoutFor } from '@/libs/components/layout';
import { GradesScreen } from '@/libs/components/student/grades/GradesScreen';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['student']);

/** The chosen child's grades: the student's Grades page with ?child= (the API checks the link) */
const ParentGrades: NextPageWithLayout = () => {
  const { query } = useRouter();
  const child = typeof query.child === 'string' ? query.child : undefined;
  if (!child) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  // key: another child starts again on the current quarter
  return <GradesScreen key={child} studentId={child} />;
};

ParentGrades.getLayout = layoutFor('PARENT');
export default ParentGrades;
