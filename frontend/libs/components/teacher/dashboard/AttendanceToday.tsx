import NextLink from 'next/link';
import { Alert, Box, Button, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { useTranslation } from 'next-i18next/pages';
import { fadeUp } from '@/libs/components/dashboard/motion';
import type { TeacherDashboardQuery } from '@/libs/gql/graphql';
import { EmptyRow, HeaderLink, ListCard, ListRow, Pill } from './parts';

type Dashboard = TeacherDashboardQuery['teacherDashboard'];

/**
 * Stitch "Today's classes" without a timetable (DECISIONS §10): every active course with today's
 * attendance state. A holiday is named above the list; the list stays (an extra lesson can happen).
 */
export function AttendanceToday({ courses, holiday, index }: { courses: Dashboard['todayCourses']; holiday: string | null; index: number }) {
  const { t } = useTranslation('teacher');

  return (
    <ListCard title={t('dashboard.today.title')} action={<HeaderLink href="/teacher/attendance">{t('dashboard.today.all')}</HeaderLink>} sx={fadeUp(index)}>
      {holiday && (
        <Box sx={{ px: 2.5, py: 1.5 }}>
          <Alert severity="info" variant="outlined" sx={{ py: 0, borderRadius: 2 }}>
            {t('dashboard.today.holiday', { name: holiday })}
          </Alert>
        </Box>
      )}
      {courses.length === 0 ? (
        <EmptyRow>{t('dashboard.today.empty')}</EmptyRow>
      ) : (
        courses.map((c) => {
          const taken = c.marked > 0;
          const href = `/teacher/attendance?course=${c.courseId}`;
          return (
            <ListRow
              key={c.courseId}
              actions={
                taken ? (
                  <>
                    <Pill tone="success" icon={<CheckCircleOutlineIcon />}>
                      {t('dashboard.today.taken', { marked: c.marked, students: c.students })}
                    </Pill>
                    <Button component={NextLink} href={href} size="small" color="inherit" sx={{ color: 'text.secondary' }}>
                      {t('dashboard.today.view')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Pill tone="warning" icon={<ScheduleOutlinedIcon />}>
                      {t('dashboard.today.notTaken')}
                    </Pill>
                    <Button component={NextLink} href={href} size="small" variant="contained" disableElevation>
                      {t('dashboard.today.take')}
                    </Button>
                  </>
                )
              }
            >
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{c.title}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                {t('dashboard.students', { count: c.students })}
              </Typography>
            </ListRow>
          );
        })
      )}
    </ListCard>
  );
}
