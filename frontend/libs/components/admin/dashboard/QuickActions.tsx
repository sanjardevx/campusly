import NextLink from 'next/link';
import { Box, Card, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LibraryAddOutlinedIcon from '@mui/icons-material/LibraryAddOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import CoPresentOutlinedIcon from '@mui/icons-material/CoPresentOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { useTranslation } from 'next-i18next/pages';
import { fadeUp } from './motion';

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

/**
 * Stitch "Quick actions" as one small link card per action, in a row under the KPI tiles.
 * The active term and week are already in the greeting line, so the row has no term footer.
 */
export function QuickActions({ index }: { index: number }) {
  const { t } = useTranslation('admin');
  return (
    <Box
      component="nav"
      aria-label={t('dashboard.quick.title')}
      sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}
    >
      {ACTIONS.map(({ key, icon: Icon, href }, i) => (
        <Card
          key={key}
          variant="outlined"
          component={NextLink}
          href={href}
          sx={{
            borderRadius: '12px',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            color: 'text.primary',
            textDecoration: 'none',
            transition: 'border-color 150ms, background-color 150ms',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'background.default' },
            '&:hover .quick-arrow': { color: 'primary.main', transform: 'translateX(2px)' },
            '&:focus-visible': { outline: 2, outlineColor: 'secondary.main', outlineOffset: 2 },
            ...fadeUp(index + i),
          }}
        >
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', display: 'grid', placeItems: 'center', flexShrink: 0, bgcolor: 'primary.light', color: 'primary.main' }}>
            <Icon sx={{ fontSize: 20 }} />
          </Box>
          <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.875rem', fontWeight: 600 }}>{t(`dashboard.quick.${key}`)}</Typography>
          <ChevronRightIcon
            className="quick-arrow"
            sx={{ fontSize: 20, color: 'text.secondary', transition: 'color 150ms, transform 150ms', '@media (prefers-reduced-motion: reduce)': { transition: 'none' } }}
          />
        </Card>
      ))}
    </Box>
  );
}
