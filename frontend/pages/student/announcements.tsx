import { useQuery } from '@apollo/client/react';
import { STUDENT_OVERVIEW } from '@/apollo/student/query';
import { layoutFor } from '@/libs/components/layout';
import { AnnouncementsView } from '@/libs/components/student/announcements/AnnouncementsView';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['student']);

/** Stitch "Announcements (Student Portal)": the course filter lists the student's own courses */
const AnnouncementsPage: NextPageWithLayout = () => {
  const { data } = useQuery(STUDENT_OVERVIEW);
  const courses = (data?.studentOverview.courses ?? []).map((c) => ({ id: c.courseId, title: c.title }));
  return <AnnouncementsView courses={courses} />;
};

AnnouncementsPage.getLayout = layoutFor('STUDENT');
export default AnnouncementsPage;
