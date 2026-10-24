import { layoutFor } from '@/libs/components/layout';
import { GradesScreen } from '@/libs/components/student/grades/GradesScreen';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['student']);

/** The student's own grades (DECISIONS §10) */
const GradesPage: NextPageWithLayout = () => <GradesScreen />;

GradesPage.getLayout = layoutFor('STUDENT');
export default GradesPage;
