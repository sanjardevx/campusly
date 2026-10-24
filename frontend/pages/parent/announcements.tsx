import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Box, CircularProgress } from '@mui/material';
import { PARENT_CHILD_COURSES } from '@/apollo/parent/query';
import { layoutFor } from '@/libs/components/layout';
import { AnnouncementsView } from '@/libs/components/student/announcements/AnnouncementsView';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['student']);

/** The chosen child's announcements: school-wide + that child's courses (studentId, checked by the API) */
const ParentAnnouncements: NextPageWithLayout = () => {
  const { query } = useRouter();
  const child = typeof query.child === 'string' ? query.child : undefined;
  const { data } = useQuery(PARENT_CHILD_COURSES, { variables: { studentId: child ?? '' }, skip: !child });
  if (!child) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  const courses = (data?.studentOverview.courses ?? []).map((c) => ({ id: c.courseId, title: c.title }));
  // key: another child starts with fresh filters
  return <AnnouncementsView key={child} studentId={child} courses={courses} />;
};

ParentAnnouncements.getLayout = layoutFor('PARENT');
export default ParentAnnouncements;
