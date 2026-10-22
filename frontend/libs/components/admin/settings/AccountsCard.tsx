import { useState } from 'react';
import { Alert, Box, InputAdornment, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { FormField } from '@/libs/components/auth/FormField';
import { useTempRule } from '@/libs/components/admin/useTempRule';
import { monoFontFamily } from '@/libs/fonts';
import type { SchoolSettingsQuery } from '@/libs/gql/graphql';
import { SettingsCard } from './SettingsCard';
import { useSettingsSave } from './useSettingsSave';

type Settings = SchoolSettingsQuery['schoolSettings'];

/** Same limits as the server (TEMP_PASSWORD_LIMITS): a long-lived temporary password is a hole */
const MAX = { uses: 10, days: 60 };

/** Temporary password rule: N sign-ins or D days, for passwords made from now on */
export function AccountsCard({ settings }: { settings: Settings }) {
  const { t } = useTranslation('admin');
  const [uses, setUses] = useState(settings.tempPasswordUses);
  const [days, setDays] = useState(settings.tempPasswordDays);
  const { editing, busy, saved, error, save, onEdit, onCancel } = useSettingsSave(() => {
    setUses(settings.tempPasswordUses);
    setDays(settings.tempPasswordDays);
  });

  const ok = (n: number, max: number) => Number.isInteger(n) && n >= 1 && n <= max;
  const valid = ok(uses, MAX.uses) && ok(days, MAX.days);
  const dirty = uses !== settings.tempPasswordUses || days !== settings.tempPasswordDays;
  // The sentence the login slips will print, live
  const rule = useTempRule(valid ? { uses, days } : undefined);

  const field = (id: string, label: string, value: number, max: number, set: (n: number) => void, unit: string) => (
    <Box sx={{ flex: 1 }}>
      <FormField
        id={id}
        type="number"
        label={label}
        value={Number.isNaN(value) ? '' : value}
        disabled={!editing}
        error={!ok(value, max)}
        onChange={(e) => set(e.target.value === '' ? NaN : Number(e.target.value))}
        slotProps={{
          input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> },
          htmlInput: { min: 1, max, style: { fontFamily: monoFontFamily } },
        }}
      />
    </Box>
  );

  return (
    <SettingsCard
      title={t('settings.accounts.title')}
      subtitle={t('settings.accounts.subtitle')}
      edit={{
        editing,
        onEdit,
        onCancel,
        dirty,
        valid,
        busy,
        saved,
        error,
        onSave: () => void save({ tempPasswordUses: uses, tempPasswordDays: days }),
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ maxWidth: 420 }}>
        {field('temp-uses', t('settings.accounts.uses'), uses, MAX.uses, setUses, `/ ${MAX.uses}`)}
        {field('temp-days', t('settings.accounts.days'), days, MAX.days, setDays, `/ ${MAX.days}`)}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 400 }}>
        {t('settings.accounts.limits')}
      </Typography>
      <Alert severity={valid ? 'info' : 'error'} sx={{ mt: 2 }}>
        {t('settings.accounts.preview', rule)}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('settings.accounts.note')}
        </Typography>
      </Alert>
    </SettingsCard>
  );
}
