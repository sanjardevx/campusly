import NextLink from 'next/link';
import { Box, Card, Link, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { fadeUp } from '@/libs/components/dashboard/motion';
import type { TeacherDashboardQuery } from '@/libs/gql/graphql';
import { Pill } from './parts';

type Dashboard = TeacherDashboardQuery['teacherDashboard'];
type CourseCard = Pick<Dashboard['courses'][number], 'id' | 'title' | 'status' | 'students' | 'week'>;

/** Stitch "My courses": a card per course with its three pages (also the My Courses page) */
export function MyCourses({ courses, index, hideTitle }: { courses: CourseCard[]; index: number; hideTitle?: boolean }) {
  const { t } = useTranslation('teacher');

  return (
    <Box component="section" sx={fadeUp(index)}>
      {!hideTitle && (
        <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 700, mb: 1.5 }}>
          {t('dashboard.courses.title')}
        </Typography>
      )}
      {courses.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: '12px', p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.courses.empty')}
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' } }}>
          {courses.map((c, i) => {
            const links = [
              ['course', `/teacher/courses/${c.id}`],
              ['gradebook', `/teacher/gradebook?course=${c.id}`],
              ['attendance', `/teacher/attendance?course=${c.id}`],
            ] as const;
            return (
              <Card
                key={c.id}
                variant="outlined"
                sx={{
                  borderRadius: '12px',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'border-color 150ms',
                  '&:hover': { borderColor: 'secondary.main' },
                  ...fadeUp(index + 1 + i),
                }}
              >
                <Box>
                  <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                    <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      {c.title}
                    </Typography>
                    <Pill tone={c.status === 'ACTIVE' ? 'success' : 'neutral'}>{t(`dashboard.courses.status.${c.status}`)}</Pill>
                  </Stack>
                  <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                    {[t('dashboard.students', { count: c.students }), c.week != null && t('dashboard.courses.week', { week: c.week })].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}
                >
                  {links.map(([key, href]) => (
                    <Link key={key} component={NextLink} href={href} underline="hover" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      {t(`dashboard.courses.${key}`)}
                    </Link>
                  ))}
                </Stack>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
