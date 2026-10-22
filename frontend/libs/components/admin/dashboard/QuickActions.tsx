import NextLink from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import LibraryAddOutlinedIcon from '@mui/icons-material/LibraryAddOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import CoPresentOutlinedIcon from '@mui/icons-material/CoPresentOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { useTranslation } from 'next-i18next/pages';
import type { AdminDashboardQuery } from '@/libs/gql/graphql';
import { DashCard } from './DashCard';
import { fadeUp } from './motion';

type Period = AdminDashboardQuery['adminDashboard']['period'];

interface Action {
  key: string;
  icon: SvgIconComponent;
  href: string;
}

// The Users and Classes pages open the right drawer from ?add=… (the same drawers as their buttons).
// Stitch had "New post" and "Add honor student": the website CMS is a later phase (S3).
const ACTIONS: Action[] = [
  { key: 'addStudent', icon: PersonAddAltOutlinedIcon, href: '/_admin/users?add=student' },
  { key: 'import', icon: UploadFileOutlinedIcon, href: '/_admin/users?add=import' },
  { key: 'addTeacher', icon: CoPresentOutlinedIcon, href: '/_admin/users?role=TEACHER&add=teacher' },
  { key: 'addCourse', icon: LibraryAddOutlinedIcon, href: '/_admin/classes?add=course' },
];

/** Stitch "Quick actions" + the active term line at the bottom */
export function QuickActions({ period, index }: { period: Period; index: number }) {
  const { t } = useTranslation('admin');
  return (
    <DashCard title={t('dashboard.quick.title')} sx={fadeUp(index)}>
      <Stack spacing={1.25} sx={{ mt: 2 }}>
        {ACTIONS.map(({ key, icon: Icon, href }) => (
          <Button
            key={key}
            variant="outlined"
            color="inherit"
            component={NextLink}
            href={href}
            startIcon={<Icon sx={{ color: 'primary.main' }} />}
            sx={{
              justifyContent: 'flex-start',
              borderColor: 'divider',
              fontSize: '0.8125rem',
              fontWeight: 500,
              py: 1.1,
              '&:hover': { borderColor: 'primary.main', bgcolor: 'background.default' },
            }}
          >
            {t(`dashboard.quick.${key}`)}
          </Button>
        ))}
      </Stack>
      <Box
        sx={{
          mt: 'auto',
          pt: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'text.secondary',
          gap: 1,
        }}
      >
        <Typography component="span" sx={{ fontSize: 'inherit' }}>
          {period ? t('dashboard.quick.term', { period: period.name }) : t('dashboard.quick.noTerm')}
        </Typography>
        {period && (
          <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 500, color: 'text.primary' }}>
            {t('dashboard.quick.week', { week: period.week, weeks: period.weeks })}
          </Typography>
        )}
      </Box>
    </DashCard>
  );
}
