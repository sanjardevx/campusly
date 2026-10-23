import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { fadeUp } from '@/libs/components/dashboard/motion';
import type { TeacherDashboardQuery } from '@/libs/gql/graphql';
import { formatDate } from '@/libs/i18n/format';
import { CourseTag, EmptyRow, ListCard, ListRow, Pill } from './parts';

type Dashboard = TeacherDashboardQuery['teacherDashboard'];
type Item = Dashboard['grading'][number];

/** The grading page of one assignment (day 11, step 3) */
export const gradingHref = (item: Pick<Item, 'courseId' | 'assignmentId'>) => `/teacher/courses/${item.courseId}/assignments/${item.assignmentId}`;

/**
 * Stitch "Needs grading": work handed in and not graded yet, and fully graded work whose scores
 * students cannot see yet (the rules are on the server: TeacherDashboardService).
 */
export function NeedsGrading({ items, total, index }: { items: Dashboard['grading']; total: number; index: number }) {
  const { t } = useTranslation('teacher');
  const { locale } = useRouter();

  /** "closed Oct 3" (no late work) · "due Oct 3 · late allowed" · "due Oct 30" */
  const due = (item: Item) => {
    if (!item.dueAt) return null;
    const date = formatDate(item.dueAt, locale);
    if (new Date(item.dueAt) > new Date()) return t('dashboard.grading.due', { date });
    return item.allowLate ? t('dashboard.grading.dueLate', { date }) : t('dashboard.grading.closed', { date });
  };

  return (
    <ListCard
      title={t('dashboard.grading.title')}
      badge={total > 0 && <Pill tone="neutral">{t('dashboard.grading.total', { count: total })}</Pill>}
      sx={fadeUp(index)}
    >
      {items.length === 0 ? (
        <EmptyRow>{t('dashboard.grading.empty')}</EmptyRow>
      ) : (
        items.map((item) => (
          <ListRow
            key={item.assignmentId}
            actions={
              item.readyToPublish ? (
                <Button component={NextLink} href={gradingHref(item)} size="small" variant="contained" disableElevation>
                  {t('dashboard.grading.publish')}
                </Button>
              ) : (
                <Button component={NextLink} href={gradingHref(item)} size="small" variant="outlined" color="inherit" sx={{ borderColor: 'divider' }}>
                  {t('dashboard.grading.grade')}
                </Button>
              )
            }
          >
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.title}</Typography>
              <CourseTag>{item.courseTitle}</CourseTag>
            </Stack>
            {item.readyToPublish ? (
              <Stack direction="row" sx={{ mt: 0.75 }}>
                <Pill tone="warning" square>
                  {t('dashboard.grading.ready')}
                </Pill>
              </Stack>
            ) : (
              <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                {[
                  t('dashboard.grading.toGrade', { count: item.toGrade }),
                  // An exam has no hand-ins: how many have a score
                  item.type === 'EXAM'
                    ? t('dashboard.grading.graded', { graded: item.graded, students: item.students })
                    : t('dashboard.grading.submitted', { submitted: item.submitted, students: item.students }),
                  due(item),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            )}
          </ListRow>
        ))
      )}
    </ListCard>
  );
}
