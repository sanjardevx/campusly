import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
} from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { CREATE_ACADEMIC_YEAR, CREATE_PERIOD, UPDATE_ACADEMIC_YEAR, UPDATE_PERIOD } from '@/apollo/admin/mutation';
import { FormField } from '@/libs/components/auth/FormField';
import { errorCode } from '@/libs/errors';
import type { PeriodKind, PeriodsQuery } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';

const KINDS: PeriodKind[] = ['QUARTER', 'SEMESTER', 'MONTH', 'CUSTOM'];
type Period = PeriodsQuery['periods'][number];

/** Shared: run one mutation, refetch the calendar, close; or show the error code's sentence */
function useCalendarSave(onDone: () => void) {
  const client = useApolloClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (change: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await change();
      await client.refetchQueries({ include: ['AcademicYears', 'Periods', 'CurrentYear'] });
      onDone();
    } catch (e) {
      setError(errorCode(e));
      setBusy(false);
    }
  };
  return { client, busy, error, run };
}

/** "YYYY-MM-DD" strings compare like dates */
const datesOk = (start: string, end: string) => !!start && !!end && end > start;

export function YearDialog({
  year,
  onClose,
}: {
  year?: { id: string; name: string; startsAt: string; endsAt: string };
  onClose: () => void;
}) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const { client, busy, error, run } = useCalendarSave(onClose);
  const [name, setName] = useState(year?.name ?? '');
  const [startsAt, setStartsAt] = useState(year?.startsAt ?? '');
  const [endsAt, setEndsAt] = useState(year?.endsAt ?? '');
  const [current, setCurrent] = useState(false);
  const valid = name.trim().length >= 4 && datesOk(startsAt, endsAt);

  const save = () =>
    run(() =>
      year
        ? client.mutate({ mutation: UPDATE_ACADEMIC_YEAR, variables: { input: { id: year.id, name: name.trim(), startsAt, endsAt } } })
        : client.mutate({
            mutation: CREATE_ACADEMIC_YEAR,
            variables: { input: { name: name.trim(), startsAt, endsAt, isCurrent: current } },
          }),
    );

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{year ? t('settings.yearDialog.editTitle') : t('settings.yearDialog.addTitle')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorText(error)}
          </Alert>
        )}
        <Stack spacing={2}>
          <FormField
            id="year-name"
            label={t('settings.yearDialog.name')}
            placeholder={t('settings.yearDialog.nameHint')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Stack direction="row" spacing={1.5}>
            <FormField id="year-start" type="date" label={t('settings.yearDialog.startsAt')} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            <FormField
              id="year-end"
              type="date"
              label={t('settings.yearDialog.endsAt')}
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              error={!!startsAt && !!endsAt && !datesOk(startsAt, endsAt)}
              helperText={!!startsAt && !!endsAt && !datesOk(startsAt, endsAt) ? t('settings.datesBad') : undefined}
            />
          </Stack>
          {!year && (
            <FormControlLabel
              control={<Checkbox checked={current} onChange={(e) => setCurrent(e.target.checked)} />}
              label={t('settings.yearDialog.makeCurrent')}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" onClick={onClose} disabled={busy}>
          {t('settings.cancel')}
        </Button>
        <Button variant="contained" onClick={() => void save()} disabled={busy || !valid}>
          {t('settings.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Add or edit a period. Kind and "inside" cannot change after creation (the server's update takes
 * only name, order and dates): a quarter does not become a semester.
 */
export function PeriodDialog({
  yearId,
  periods,
  period,
  onClose,
}: {
  yearId: string;
  periods: Period[];
  period?: Period;
  onClose: () => void;
}) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const { client, busy, error, run } = useCalendarSave(onClose);
  const nextOrder = Math.max(0, ...periods.map((p) => p.order)) + 1;
  const [name, setName] = useState(period?.name ?? '');
  const [kind, setKind] = useState<PeriodKind>(period?.kind ?? 'QUARTER');
  const [parentId, setParentId] = useState(period?.parentId ?? '');
  const [order, setOrder] = useState(period?.order ?? nextOrder);
  const [startsAt, setStartsAt] = useState(period?.startsAt ?? '');
  const [endsAt, setEndsAt] = useState(period?.endsAt ?? '');
  const parents = periods.filter((p) => p.kind === 'SEMESTER' && p.id !== period?.id);
  const valid = name.trim().length >= 2 && Number.isInteger(order) && order >= 1 && order <= 50 && datesOk(startsAt, endsAt);

  const save = () =>
    run(() =>
      period
        ? client.mutate({ mutation: UPDATE_PERIOD, variables: { input: { id: period.id, name: name.trim(), order, startsAt, endsAt } } })
        : client.mutate({
            mutation: CREATE_PERIOD,
            variables: { input: { academicYearId: yearId, kind, name: name.trim(), order, startsAt, endsAt, parentId: parentId || undefined } },
          }),
    );

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{period ? t('settings.periodDialog.editTitle') : t('settings.periodDialog.addTitle')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorText(error)}
          </Alert>
        )}
        <Stack spacing={2}>
          <FormField
            id="period-name"
            label={t('settings.periodDialog.name')}
            placeholder={t('settings.periodDialog.nameHint')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Stack direction="row" spacing={1.5}>
            <FormField
              id="period-kind"
              select
              label={t('settings.periodDialog.kind')}
              value={kind}
              disabled={!!period}
              onChange={(e) => setKind(e.target.value as PeriodKind)}
            >
              {KINDS.map((k) => (
                <MenuItem key={k} value={k}>
                  {t(`settings.kind.${k}`)}
                </MenuItem>
              ))}
            </FormField>
            <FormField
              id="period-order"
              type="number"
              label={t('settings.periodDialog.order')}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              slotProps={{ htmlInput: { min: 1, max: 50 } }}
            />
          </Stack>
          {kind !== 'SEMESTER' && parents.length > 0 && (
            <FormField
              id="period-parent"
              select
              label={t('settings.periodDialog.parent')}
              value={parentId}
              disabled={!!period}
              onChange={(e) => setParentId(e.target.value)}
            >
              <MenuItem value="">{t('settings.periodDialog.none')}</MenuItem>
              {parents.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </FormField>
          )}
          <Stack direction="row" spacing={1.5}>
            <FormField id="period-start" type="date" label={t('settings.periodDialog.startsAt')} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            <FormField
              id="period-end"
              type="date"
              label={t('settings.periodDialog.endsAt')}
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              error={!!startsAt && !!endsAt && !datesOk(startsAt, endsAt)}
              helperText={!!startsAt && !!endsAt && !datesOk(startsAt, endsAt) ? t('settings.datesBad') : undefined}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" onClick={onClose} disabled={busy}>
          {t('settings.cancel')}
        </Button>
        <Button variant="contained" onClick={() => void save()} disabled={busy || !valid}>
          {t('settings.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
