import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { Box, Card, Link, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import CoPresentOutlinedIcon from '@mui/icons-material/CoPresentOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useTranslation } from 'next-i18next/pages';
import type { AdminDashboardQuery } from '@/libs/gql/graphql';
import { viz } from '@/libs/viz';
import { fadeUp, useCountUp } from '@/libs/components/dashboard/motion';

type Dashboard = AdminDashboardQuery['adminDashboard'];
type Tile = keyof typeof viz.tile;

/** "+12.0%" growth against the start of the month; null when there was nothing to grow from */
const growth = (total: number, added: number) =>
  total - added > 0 ? Math.round((added / (total - added)) * 1000) / 10 : null;

/** Up = green arrow, down = red arrow, always with the number (never colour alone) */
function Delta({ value, suffix, note }: { value: number | null; suffix: string; note: string }) {
  if (value == null) return <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{note}</Typography>;
  const up = value >= 0;
  const Icon = up ? TrendingUpIcon : TrendingDownIcon;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
      <Box
        component="span"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, fontSize: '0.75rem', fontWeight: 600, color: up ? 'success.main' : 'error.main' }}
      >
        <Icon sx={{ fontSize: 16 }} />
        {up ? '+' : '−'}
        {Math.abs(value).toFixed(1)}
        {suffix}
      </Box>
      <Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
        {note}
      </Typography>
    </Box>
  );
}

function Kpi({
  index,
  icon: Icon,
  tile,
  label,
  value,
  decimals = 0,
  unit = '',
  footer,
}: {
  index: number;
  icon: SvgIconComponent;
  tile: Tile;
  label: string;
  value: number | null;
  decimals?: number;
  unit?: string;
  footer: ReactNode;
}) {
  const { i18n } = useTranslation();
  const counted = useCountUp(value ?? 0);
  const text =
    value == null
      ? '—'
      : `${counted.toLocaleString(i18n.language, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${unit}`;

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 1.5, ...fadeUp(index) }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: viz.tile[tile].bg,
          color: viz.tile[tile].fg,
        }}
      >
        <Icon sx={{ fontSize: 22 }} />
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'text.secondary' }}>{label}</Typography>
        {/* Proportional digits on the hero number (dataviz: tabular only in columns) */}
        <Typography
          sx={{ fontSize: { xs: '1.5rem', sm: '1.875rem' }, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, fontVariantNumeric: 'proportional-nums', color: value == null ? 'text.disabled' : 'text.primary' }}
        >
          {text}
        </Typography>
      </Box>
      {footer}
    </Card>
  );
}

/** Row 1: Students · Teachers · Attendance this month · Not signed in yet (S1) */
export function KpiRow({ data }: { data: Dashboard }) {
  const { t } = useTranslation('admin');
  const attendanceDelta =
    data.attendanceThisMonth != null && data.attendanceLastMonth != null
      ? data.attendanceThisMonth - data.attendanceLastMonth
      : null;

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}>
      <Kpi
        index={0}
        icon={SchoolOutlinedIcon}
        tile="spruce"
        label={t('dashboard.kpi.students')}
        value={data.students}
        footer={
          <Delta
            value={growth(data.students, data.newStudentsThisMonth)}
            suffix="%"
            note={t('dashboard.kpi.newThisMonth', { count: data.newStudentsThisMonth })}
          />
        }
      />
      <Kpi
        index={1}
        icon={CoPresentOutlinedIcon}
        tile="blue"
        label={t('dashboard.kpi.teachers')}
        value={data.teachers}
        footer={
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {t('dashboard.kpi.classesCourses', { classes: data.classes, courses: data.courses })}
          </Typography>
        }
      />
      <Kpi
        index={2}
        icon={EventAvailableOutlinedIcon}
        tile="aqua"
        label={t('dashboard.kpi.attendanceMonth')}
        value={data.attendanceThisMonth}
        decimals={1}
        unit="%"
        footer={<Delta value={attendanceDelta} suffix={` ${t('dashboard.kpi.points')}`} note={t('dashboard.kpi.vsLastMonth')} />}
      />
      <Kpi
        index={3}
        icon={KeyOutlinedIcon}
        tile="amber"
        label={t('dashboard.kpi.notSignedIn')}
        value={data.notSignedIn}
        footer={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, fontSize: '0.75rem' }}>
            <Typography component="span" sx={{ fontSize: 'inherit', color: 'text.secondary' }}>
              {t('dashboard.kpi.ofAccounts', { count: data.accounts })}
            </Typography>
            {data.notSignedIn > 0 && (
              <Link component={NextLink} href="/_admin/users?password=TEMPORARY" underline="hover" sx={{ fontSize: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {t('dashboard.kpi.review')}
              </Link>
            )}
          </Box>
        }
      />
    </Box>
  );
}
