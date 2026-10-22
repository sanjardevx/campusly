import { useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Button, Divider, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem } from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'next-i18next/pages';
import { CURRENT_YEAR, PERIODS } from '@/apollo/app/query';
import { SCHOOL_TIMEZONE } from '@/libs/config';
import { formatDay } from '@/libs/i18n/format';

/** Today as "YYYY-MM-DD" in the school's timezone (en-CA formats dates exactly like that) */
const schoolToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TIMEZONE }).format(new Date());

/**
 * Admin top bar: "2026–27 · Quarter 1". The current period is the narrowest one that contains
 * today (a quarter inside a semester wins). Changing the year is done in Settings, not here:
 * it changes the school for everyone.
 */
export function YearPill() {
  const { t } = useTranslation('common');
  const { locale } = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const year = useQuery(CURRENT_YEAR).data?.currentAcademicYear;
  const { data } = useQuery(PERIODS, { variables: { academicYearId: year?.id ?? '' }, skip: !year });
  if (!year) return null;

  const today = schoolToday();
  const periods = [...(data?.periods ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.order - b.order);
  const span = (p: { startsAt: string; endsAt: string }) => Date.parse(p.endsAt) - Date.parse(p.startsAt);
  const current = periods
    .filter((p) => p.startsAt <= today && today <= p.endsAt)
    .sort((a, b) => span(a) - span(b))[0];

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        startIcon={<CalendarTodayOutlinedIcon sx={{ fontSize: '16px !important', color: 'text.secondary' }} />}
        endIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
        sx={{ fontWeight: 500, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
      >
        {current ? t('shell.period', { year: year.name, period: current.name }) : year.name}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <ListSubheader sx={{ lineHeight: 2.5 }}>{t('shell.periods', { year: year.name })}</ListSubheader>
        {periods.length === 0 && <MenuItem disabled>{t('shell.noPeriod')}</MenuItem>}
        {periods.map((p) => (
          <MenuItem key={p.id} selected={p.id === current?.id} sx={{ pl: p.parentId ? 4 : 2 }} onClick={() => setAnchor(null)}>
            <ListItemText primary={p.name} secondary={`${formatDay(p.startsAt, locale)} – ${formatDay(p.endsAt, locale)}`} />
            {p.id === current?.id && (
              <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                <CheckIcon fontSize="small" color="primary" />
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem component={NextLink} href="/_admin/settings" onClick={() => setAnchor(null)}>
          {t('shell.manageYears')}
        </MenuItem>
      </Menu>
    </>
  );
}
