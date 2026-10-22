import { useState } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient, useQuery } from '@apollo/client/react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useTranslation } from 'next-i18next/pages';
import { SET_CURRENT_YEAR } from '@/apollo/admin/mutation';
import { ACADEMIC_YEARS } from '@/apollo/admin/query';
import { PERIODS } from '@/apollo/app/query';
import { ConfirmDialog } from '@/libs/components/admin/ConfirmDialog';
import { errorCode } from '@/libs/errors';
import type { PeriodsQuery } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { formatDay } from '@/libs/i18n/format';
import { PeriodDialog, YearDialog } from './CalendarDialogs';
import { SettingsCard } from './SettingsCard';

const head = { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' } as const;

type Open =
  | { kind: 'addYear' }
  | { kind: 'editYear'; id: string }
  | { kind: 'current'; id: string }
  | { kind: 'addPeriod' }
  | { kind: 'editPeriod'; period: PeriodsQuery['periods'][number] };

/** Years (one is current) and the periods of the chosen year. Nothing is deleted (DECISIONS §5) */
export function YearsCard() {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const { locale } = useRouter();
  const client = useApolloClient();
  const years = useQuery(ACADEMIC_YEARS, { fetchPolicy: 'cache-and-network' }).data?.academicYears ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const year = years.find((y) => y.id === picked) ?? years.find((y) => y.isCurrent) ?? years[0];
  const periods = [...(useQuery(PERIODS, { skip: !year, variables: { academicYearId: year?.id ?? '' } }).data?.periods ?? [])].sort(
    (a, b) => a.startsAt.localeCompare(b.startsAt) || a.order - b.order,
  );
  const range = (a: string, b: string) => `${formatDay(a, locale)} – ${formatDay(b, locale)}`;

  const makeCurrent = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await client.mutate({ mutation: SET_CURRENT_YEAR, variables: { id } });
      // Everything that is "of the current year" changes with it
      await client.refetchQueries({ include: ['AcademicYears', 'CurrentYear', 'Periods', 'Groups', 'Courses'] });
      setOpen(null);
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  };

  const target = open?.kind === 'current' || open?.kind === 'editYear' ? years.find((y) => y.id === open.id) : undefined;

  return (
    <SettingsCard
      title={t('settings.years.title')}
      subtitle={t('settings.years.subtitle')}
      action={
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen({ kind: 'addYear' })} sx={{ flexShrink: 0 }}>
          {t('settings.years.add')}
        </Button>
      }
    >
      {error && (
        <Typography color="error.main" sx={{ mb: 1 }}>
          {errorText(error)}
        </Typography>
      )}
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small" sx={{ '& td, & th': { py: 1.25 } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell sx={head}>{t('settings.years.col.name')}</TableCell>
              <TableCell sx={head}>{t('settings.years.col.dates')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {years.map((y) => (
              <TableRow
                key={y.id}
                hover
                selected={y.id === year?.id}
                onClick={() => setPicked(y.id)}
                sx={{ cursor: 'pointer', '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'primary.light' } }}
              >
                <TableCell sx={{ fontWeight: 600 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <span>{y.name}</span>
                    {y.isCurrent && <Chip size="small" label={t('settings.years.current')} sx={{ color: 'success.main', bgcolor: 'success.light' }} />}
                  </Stack>
                </TableCell>
                <TableCell>{range(y.startsAt, y.endsAt)}</TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  {!y.isCurrent && (
                    <Button size="small" onClick={() => setOpen({ kind: 'current', id: y.id })}>
                      {t('settings.years.makeCurrent')}
                    </Button>
                  )}
                  <Tooltip title={t('settings.years.edit')}>
                    <IconButton size="small" aria-label={t('settings.years.edit')} onClick={() => setOpen({ kind: 'editYear', id: y.id })}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {years.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  {t('settings.years.noYears')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      {year && (
        <>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 1.25 }}>
            <Typography sx={{ fontWeight: 600 }}>{t('settings.years.periods', { name: year.name })}</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setOpen({ kind: 'addPeriod' })}>
              {t('settings.years.addPeriod')}
            </Button>
          </Stack>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small" sx={{ '& td, & th': { py: 1.25 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={head}>{t('settings.years.col.name')}</TableCell>
                  <TableCell sx={head}>{t('settings.years.col.kind')}</TableCell>
                  <TableCell sx={head}>{t('settings.years.col.dates')}</TableCell>
                  <TableCell sx={head} align="right">
                    {t('settings.years.col.order')}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 600, pl: p.parentId ? 4 : 2 }}>{p.name}</TableCell>
                    <TableCell>{t(`settings.kind.${p.kind}`)}</TableCell>
                    <TableCell>{range(p.startsAt, p.endsAt)}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {p.order}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('settings.years.edit')}>
                        <IconButton size="small" aria-label={t('settings.years.edit')} onClick={() => setOpen({ kind: 'editPeriod', period: p })}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {periods.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      {t('settings.years.noPeriods')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </>
      )}

      {open?.kind === 'addYear' && <YearDialog onClose={() => setOpen(null)} />}
      {open?.kind === 'editYear' && target && <YearDialog year={target} onClose={() => setOpen(null)} />}
      {open?.kind === 'addPeriod' && year && <PeriodDialog yearId={year.id} periods={periods} onClose={() => setOpen(null)} />}
      {open?.kind === 'editPeriod' && year && (
        <PeriodDialog yearId={year.id} periods={periods} period={open.period} onClose={() => setOpen(null)} />
      )}
      <ConfirmDialog
        open={open?.kind === 'current' && !!target}
        title={target ? t('settings.years.currentTitle', { name: target.name }) : ''}
        body={target ? t('settings.years.currentBody', { name: target.name }) : ''}
        confirmLabel={t('settings.years.currentConfirm')}
        busy={busy}
        onConfirm={() => target && void makeCurrent(target.id)}
        onClose={() => setOpen(null)}
      />
    </SettingsCard>
  );
}
