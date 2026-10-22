import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Button, CircularProgress, MenuItem, Stack } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'next-i18next/pages';
import { CREATE_SCHOOL_EVENT, UPDATE_SCHOOL_EVENT } from '@/apollo/admin/mutation';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { FormField } from '@/libs/components/auth/FormField';
import { errorCode } from '@/libs/errors';
import type { SchoolEventKind } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import type { CalendarEvent } from './CalendarCard';

const KINDS: SchoolEventKind[] = ['HOLIDAY', 'EVENT', 'DEADLINE', 'START'];

/**
 * Add or edit a school calendar entry. One day by default; an end date makes it a range
 * (a holiday week). The server checks the dates again (DATES_ORDER, at most 92 days).
 */
export function EventDrawer({
  event,
  defaultDay,
  onClose,
  onSaved,
}: {
  /** null = a new event on defaultDay */
  event: CalendarEvent | null;
  defaultDay: string;
  onClose: () => void;
  /** The start day, so the calendar can jump to it */
  onSaved: (day: string) => void;
}) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const [form, setForm] = useState({
    kind: (event?.kind as SchoolEventKind | undefined) ?? 'EVENT',
    title: event?.title ?? '',
    startsOn: event?.startsOn ?? defaultDay,
    endsOn: event && event.endsOn !== event.startsOn ? event.endsOn : '',
    note: event?.note ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const options = { refetchQueries: ['DashboardCalendar', 'AdminDashboard'] };
  const [create, createState] = useMutation(CREATE_SCHOOL_EVENT, options);
  const [update, updateState] = useMutation(UPDATE_SCHOOL_EVENT, options);
  const saving = createState.loading || updateState.loading;

  const title = form.title.trim();
  const datesOk = !form.endsOn || form.endsOn >= form.startsOn;
  const valid = title.length >= 2 && !!form.startsOn && datesOk;

  const save = async () => {
    setError(null);
    try {
      if (event?.schoolEventId) {
        await update({
          variables: {
            input: {
              id: event.schoolEventId,
              kind: form.kind,
              title,
              startsOn: form.startsOn,
              // No end date = back to a one-day event
              endsOn: form.endsOn || form.startsOn,
              note: form.note.trim(),
            },
          },
        });
      } else {
        await create({
          variables: {
            input: {
              kind: form.kind,
              title,
              startsOn: form.startsOn,
              endsOn: form.endsOn || undefined,
              note: form.note.trim() || undefined,
            },
          },
        });
      }
      onSaved(form.startsOn);
    } catch (err) {
      setError(errorCode(err));
    }
  };

  return (
    <SideDrawer
      open
      title={event ? t('dashboard.event.editTitle') : t('dashboard.event.addTitle')}
      subtitle={t('dashboard.event.subtitle')}
      closeLabel={t('add.close')}
      onClose={onClose}
      footer={
        <>
          <Button variant="outlined" onClick={onClose} disabled={saving}>
            {t('add.cancel')}
          </Button>
          <Button
            variant="contained"
            sx={{ ml: 'auto' }}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            disabled={saving || !valid}
            onClick={() => void save()}
          >
            {t('dashboard.event.save')}
          </Button>
        </>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorText(error)}
        </Alert>
      )}
      <DrawerSection title={t('dashboard.event.section')}>
        <Stack spacing={2}>
          <FormField
            id="event-kind"
            select
            label={t('dashboard.event.kind')}
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as SchoolEventKind })}
          >
            {KINDS.map((k) => (
              <MenuItem key={k} value={k}>
                {t(`dashboard.calendar.kind.${k}`)}
              </MenuItem>
            ))}
          </FormField>
          <FormField
            id="event-title"
            label={t('dashboard.event.name')}
            placeholder={t('dashboard.event.namePlaceholder')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <Stack direction="row" spacing={1.5}>
            <FormField
              id="event-start"
              type="date"
              label={t('dashboard.event.startsOn')}
              value={form.startsOn}
              onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
            />
            <FormField
              id="event-end"
              type="date"
              label={t('dashboard.event.endsOn')}
              value={form.endsOn}
              error={!datesOk}
              helperText={datesOk ? t('dashboard.event.endsOnHint') : t('dashboard.event.endsOnBad')}
              slotProps={{ htmlInput: { min: form.startsOn } }}
              onChange={(e) => setForm({ ...form, endsOn: e.target.value })}
            />
          </Stack>
          <FormField
            id="event-note"
            label={t('dashboard.event.note')}
            placeholder={t('dashboard.event.notePlaceholder')}
            value={form.note}
            multiline
            minRows={2}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            slotProps={{ htmlInput: { maxLength: 300 } }}
          />
        </Stack>
      </DrawerSection>
    </SideDrawer>
  );
}
