import { useRouter } from 'next/router';
import { Box, Card, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useTranslation } from 'next-i18next/pages';
import type { AdminDashboardQuery } from '@/libs/gql/graphql';
import { formatLastSeen } from '@/libs/i18n/format';
import { viz } from '@/libs/viz';
import { fadeUp } from './motion';

type Activity = AdminDashboardQuery['adminDashboard']['recentActivity'];

/** The entity part of "user.resetPassword" picks the icon and its tint */
const GROUPS: { prefixes: string[]; icon: SvgIconComponent; tile: keyof typeof viz.tile }[] = [
  { prefixes: ['user', 'users', 'parent', 'student'], icon: PersonOutlineIcon, tile: 'spruce' },
  { prefixes: ['course', 'group', 'subject'], icon: ClassOutlinedIcon, tile: 'blue' },
  { prefixes: ['submission', 'assignment', 'periodGrade', 'periodGrades'], icon: FactCheckOutlinedIcon, tile: 'aqua' },
  { prefixes: ['records'], icon: FolderOpenOutlinedIcon, tile: 'amber' },
];
const groupOf = (action: string) =>
  GROUPS.find((g) => g.prefixes.includes(action.split('.')[0])) ?? { icon: SettingsOutlinedIcon, tile: 'spruce' as const };

/** S2: the latest audit rows — who did what, when. The full Activity log page is day 14. */
export function RecentActivity({ items, index }: { items: Activity; index: number }) {
  const { t } = useTranslation('admin');
  const { locale } = useRouter();

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5, ...fadeUp(index) }}>
      <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 700 }}>
        {t('dashboard.activity.title')}
      </Typography>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          {t('dashboard.activity.empty')}
        </Typography>
      ) : (
        <Stack sx={{ mt: 1 }}>
          {items.map((item, i) => {
            const { icon: Icon, tile } = groupOf(item.action);
            // An action added later without a translation still reads, as its raw name
            const what = t(`dashboard.activity.actions.${item.action.replace('.', '_')}`, { defaultValue: item.action });
            return (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1.25,
                  px: 1,
                  mx: -1,
                  borderRadius: 2,
                  borderBottom: i < items.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  transition: 'background-color 150ms',
                  '&:hover': { bgcolor: 'background.default' },
                }}
              >
                <Box sx={{ width: 32, height: 32, borderRadius: '9px', display: 'grid', placeItems: 'center', bgcolor: viz.tile[tile].bg, color: viz.tile[tile].fg, flexShrink: 0 }}>
                  <Icon sx={{ fontSize: 18 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }} noWrap>
                    {what}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>
                    {item.actorName ?? t('dashboard.activity.system')}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', flexShrink: 0 }}>
                  {formatLastSeen(item.createdAt, locale, (key, options) => t(key, options))}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}
