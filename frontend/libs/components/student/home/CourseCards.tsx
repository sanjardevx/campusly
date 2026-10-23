import NextLink from 'next/link';
import { Box, Card, CardActionArea, Link, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useTranslation } from 'next-i18next/pages';
import type { StudentOverviewQuery } from '@/libs/gql/graphql';
import { studentHref } from './due';
import { ProgressBar, STITCH, SectionTitle, SoftPill, enter, liftSx } from './parts';

type Course = StudentOverviewQuery['studentOverview']['courses'][number];

/** Stitch "My Courses": subject, owner teacher, "N new" and the curriculum progress bar */
export function CourseCards({ courses, periodName, index }: { courses: Course[]; periodName: string | null; index: number }) {
  const { t } = useTranslation('student');
  const count = courses.length;

  return (
    <Box component="section" sx={enter(index)}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2.5 }}>
        <SectionTitle
          title={t('home.courses.title')}
          subtitle={periodName ? t('home.courses.subtitle', { period: periodName, count }) : t('home.courses.count', { count })}
        />
        <Link
          component={NextLink}
          href="/student/courses"
          underline="none"
          sx={{ color: 'secondary.main', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap', '&:hover': { color: 'primary.main' } }}
        >
          {t('home.courses.all')}
          <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
        </Link>
      </Stack>

      {count === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: '12px', borderColor: STITCH.outline, p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('home.courses.empty')}
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' } }}>
          {courses.map((c, i) => (
            <Card
              key={c.courseId}
              variant="outlined"
              sx={{ borderRadius: '12px', borderColor: STITCH.outline, '&:hover': { borderColor: 'secondary.main' }, ...liftSx, ...enter(index + 1 + i) }}
            >
              <CardActionArea component={NextLink} href={studentHref.course(c.courseId)} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between', gap: 2 }}>
                <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component="h3" sx={{ fontSize: '1.125rem', lineHeight: '1.625rem', fontWeight: 600, letterSpacing: '-0.005em' }}>
                      {c.subjectName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.84375rem', lineHeight: '1.375rem', color: 'text.secondary' }}>{c.teacherName ?? c.title}</Typography>
                  </Box>
                  {c.newCount > 0 ? <SoftPill tone="mint">{t('home.courses.new', { count: c.newCount })}</SoftPill> : <SoftPill tone="neutral">{t('home.courses.upToDate')}</SoftPill>}
                </Stack>
                <Box sx={{ pt: 1, borderTop: 1, borderColor: STITCH.outlineSoft }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.75, fontSize: '0.75rem', fontWeight: 600 }}>
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      {t('home.courses.progress')}
                    </Box>
                    <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {c.progress == null ? t('home.courses.noLessons') : `${c.progress}%`}
                    </Box>
                  </Stack>
                  <ProgressBar value={c.progress ?? 0} label={t('home.courses.progress')} index={i} />
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
