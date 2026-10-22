import { Tab, Tabs } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { AttendanceTab } from '@/libs/components/admin/records/AttendanceTab';
import { GradesTab } from '@/libs/components/admin/records/GradesTab';
import { ReportCardTab } from '@/libs/components/admin/records/ReportCardTab';
import { StudentsTab } from '@/libs/components/admin/records/StudentsTab';
import { layoutFor } from '@/libs/components/layout';
import type { RecordReport } from '@/libs/gql/graphql';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { useQueryParams } from '@/libs/hooks/useQueryParams';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['admin']);

const REPORTS: RecordReport[] = ['STUDENTS', 'GRADES', 'ATTENDANCE', 'REPORT_CARD'];
const TAB = { STUDENTS: StudentsTab, GRADES: GradesTab, ATTENDANCE: AttendanceTab, REPORT_CARD: ReportCardTab };

/**
 * Records: the school's documents (class lists, grades and attendance journals, report cards)
 * shown as tables and taken as CSV or on paper. Every download and print is audited (DECISIONS §9).
 */
const RecordsPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const [params, setParams] = useQueryParams();
  const report = REPORTS.includes(params.tab as RecordReport) ? (params.tab as RecordReport) : 'STUDENTS';
  useCrumb(t(`records.tabs.${report}`));
  const Current = TAB[report];

  return (
    <>
      <PageHeader title={t('records.title')} subtitle={t('records.subtitle')} />
      <Tabs
        value={report}
        // The class carries over (class list → report card of the same class); the rest starts over
        onChange={(_, next: RecordReport) => setParams({ tab: next === 'STUDENTS' ? undefined : next, student: undefined, period: undefined })}
        variant="scrollable"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {REPORTS.map((r) => (
          <Tab key={r} value={r} label={t(`records.tabs.${r}`)} />
        ))}
      </Tabs>
      <Current params={params} setParams={setParams} />
    </>
  );
};

RecordsPage.getLayout = layoutFor('ADMIN');
export default RecordsPage;
