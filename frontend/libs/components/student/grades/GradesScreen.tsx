import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Card, CircularProgress, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { MY_GRADES } from '@/apollo/student/query';
import { FINAL, FinalTable, GradesHeader, GradesViewer, PeriodTabs, QuarterList, QuarterTable } from './GradesView';

/**
 * Stitch "Student Grades (Compact eCampus Gradebook)" (DECISIONS §10): one quarter at a time
 * (myGrades, the current one first) or Final with every quarter and the annual grade.
 * The student page passes nothing; the parent page passes the chosen child (?child=).
 */
export function GradesScreen({ studentId }: { studentId?: string }) {
  const { t } = useTranslation('student');
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  // null = the current quarter (the server picks it); FINAL keeps the last quarter's course list
  const [tab, setTab] = useState<string | null>(null);
  const periodId = tab && tab !== FINAL ? tab : null;
  const { data, previousData } = useQuery(MY_GRADES, { variables: { periodId: tab === FINAL ? null : periodId, studentId }, fetchPolicy: 'cache-and-network' });
  const grades = (data ?? previousData)?.myGrades;

  if (!grades) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const value = tab ?? grades.period?.id ?? FINAL;
  const empty = (text: string) => (
    <Card variant="outlined" sx={{ borderRadius: '12px', p: 4, textAlign: 'center' }}>
      <Typography color="text.secondary">{text}</Typography>
    </Card>
  );

  return (
    <GradesViewer.Provider value={{ studentId }}>
      <Stack spacing={3}>
        <GradesHeader data={grades} tabs={<PeriodTabs periods={grades.periods} value={value} onChange={setTab} />} />
        {!grades.period
          ? empty(t('grades.noPeriods'))
          : grades.courses.length === 0
            ? empty(t('grades.empty'))
            : value === FINAL
              ? <FinalTable data={grades} />
              : desktop
                ? <QuarterTable data={grades} />
                : <QuarterList data={grades} />}
      </Stack>
    </GradesViewer.Provider>
  );
}
