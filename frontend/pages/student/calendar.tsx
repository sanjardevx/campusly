import { layoutFor } from '@/libs/components/layout';
import { CalendarView } from '@/libs/components/calendar/CalendarView';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['student', 'calendar']);

/** The student's month: school dates and their own work with its status (DECISIONS §14) */
const CalendarPage: NextPageWithLayout = () => <CalendarView linkWork />;

CalendarPage.getLayout = layoutFor('STUDENT');
export default CalendarPage;
