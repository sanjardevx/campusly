import { Box, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from 'next-i18next/pages';
import { fadeUp } from '@/libs/components/dashboard/motion';
import type { TeacherDashboardQuery } from '@/libs/gql/graphql';
import { EmptyRow, HeaderLink, ListCard, Pill } from './parts';

type Announcement = TeacherDashboardQuery['teacherDashboard']['announcements'][number];

/** Stitch "Recent announcements": the teacher's own, with how many students opened each one */
export function RecentAnnouncements({ items, index }: { items: Announcement[]; index: number }) {
  const { t } = useTranslation('teacher');

  return (
    <ListCard
      title={t('dashboard.announcements.title')}
      action={<HeaderLink href="/teacher/announcements">{t('dashboard.announcements.all')}</HeaderLink>}
      sx={fadeUp(index)}
    >
      {items.length === 0 ? (
        <EmptyRow>{t('dashboard.announcements.empty')}</EmptyRow>
      ) : (
        items.map((a) => {
          const everyone = a.audience != null && a.audience > 0 && a.reads >= a.audience;
          return (
            <Box key={a.id} sx={{ px: 2.5, py: 1.75, transition: 'background-color 150ms', '&:hover': { bgcolor: 'background.default' } }}>
              <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{a.title}</Typography>
                <Pill tone="success" icon={everyone ? <CheckCircleOutlineIcon /> : <VisibilityOutlinedIcon />}>
                  {a.audience == null ? t('dashboard.announcements.readCount', { count: a.reads }) : t('dashboard.announcements.read', { reads: a.reads, audience: a.audience })}
                </Pill>
              </Stack>
              <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>{a.courseTitle ?? t('dashboard.announcements.school')}</Typography>
            </Box>
          );
        })
      )}
    </ListCard>
  );
}
