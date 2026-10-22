import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Autocomplete, Box, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { USERS } from '@/apollo/admin/query';
import { FormField } from '@/libs/components/auth/FormField';
import { PhonePrefix } from '@/libs/components/PhonePrefix';
import type { ParentRelation } from '@/libs/gql/graphql';
import { useDebounce } from '@/libs/hooks/useDebounce';
import { formatPhone } from '@/libs/i18n/format';

export const RELATIONS: ParentRelation[] = ['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'];

export interface ParentForm {
  mode: 'new' | 'existing';
  firstName: string;
  lastName: string;
  /** 9 local digits, e.g. "901234567" (+998 is the grey prefix) */
  phone: string;
  relation: ParentRelation;
  /** The parent picked in "Existing parent" (for the label only: the server links by phone) */
  existingLabel?: string;
}

export const EMPTY_PARENT: ParentForm = { mode: 'new', firstName: '', lastName: '', phone: '', relation: 'FATHER' };

/** Any typed or pasted shape ("+998 90 123-45-67") → the 9 local digits */
export const phoneDigits = (input: string) => {
  let digits = input.replace(/\D/g, '');
  if (digits.length > 9 && digits.startsWith('998')) digits = digits.slice(3);
  return digits.slice(0, 9);
};
/** "901234567" → "90 123 45 67" while typing */
const groupDigits = (d: string) => [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');

/** Nothing typed = no parent now (the backend makes the parent optional) */
export const isEmptyParent = (p: ParentForm) => p.mode === 'new' && !p.firstName.trim() && !p.lastName.trim() && !p.phone;

/** Field errors (translation keys), or null when the parent can be sent */
export function parentErrors(p: ParentForm): Partial<Record<'firstName' | 'lastName' | 'phone' | 'existing', string>> | null {
  if (p.mode === 'existing') return p.phone.length === 9 ? null : { existing: 'add.pickParent' };
  const errors: Record<string, string> = {};
  if (p.firstName.trim().length < 2) errors.firstName = 'add.nameLength';
  if (p.lastName.trim().length < 2) errors.lastName = 'add.nameLength';
  if (p.phone.length !== 9) errors.phone = 'add.phoneInvalid';
  return Object.keys(errors).length ? errors : null;
}

export function ParentFields({
  idPrefix,
  value,
  showErrors,
  disabled,
  onChange,
}: {
  idPrefix: string;
  value: ParentForm;
  showErrors: boolean;
  disabled?: boolean;
  onChange: (next: ParentForm) => void;
}) {
  const { t } = useTranslation('admin');
  const [search, setSearch] = useState('');
  const text = useDebounce(search.trim());
  // Existing parents: the same users list the table uses, filtered on the server
  const { data, loading } = useQuery(USERS, {
    skip: value.mode !== 'existing' || text.length < 2,
    variables: { input: { page: 1, limit: 10, search: { role: 'PARENT', status: 'ACTIVE', text } } },
  });
  const errors = showErrors && !isEmptyParent(value) ? parentErrors(value) : null;
  const err = (key: 'firstName' | 'lastName' | 'phone' | 'existing') =>
    errors?.[key] ? { error: true, helperText: t(errors[key]) } : {};
  const set = (patch: Partial<ParentForm>) => onChange({ ...value, ...patch });

  return (
    <>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={value.mode}
        disabled={disabled}
        onChange={(_, mode: ParentForm['mode'] | null) => mode && onChange({ ...EMPTY_PARENT, mode, relation: value.relation })}
        sx={{
          bgcolor: '#EFEEEA',
          p: 0.5,
          borderRadius: 2,
          '& .MuiToggleButton-root': { border: 0, borderRadius: '6px !important', textTransform: 'none', fontWeight: 500 },
          '& .MuiToggleButton-root.Mui-selected': { bgcolor: 'background.paper', fontWeight: 700, boxShadow: 1 },
        }}
      >
        <ToggleButton value="new">{t('add.newParent')}</ToggleButton>
        <ToggleButton value="existing">{t('add.existingParent')}</ToggleButton>
      </ToggleButtonGroup>

      {value.mode === 'new' ? (
        <>
          <Stack direction="row" spacing={1.5}>
            <FormField
              id={`${idPrefix}-first`}
              label={t('add.firstName')}
              value={value.firstName}
              disabled={disabled}
              onChange={(e) => set({ firstName: e.target.value })}
              {...err('firstName')}
            />
            <FormField
              id={`${idPrefix}-last`}
              label={t('add.lastName')}
              value={value.lastName}
              disabled={disabled}
              onChange={(e) => set({ lastName: e.target.value })}
              {...err('lastName')}
            />
          </Stack>
          <FormField
            id={`${idPrefix}-phone`}
            label={t('add.phone')}
            value={groupDigits(value.phone)}
            disabled={disabled}
            placeholder="90 123 45 67"
            onChange={(e) => set({ phone: phoneDigits(e.target.value) })}
            slotProps={{ input: { startAdornment: <PhonePrefix /> }, htmlInput: { inputMode: 'numeric' } }}
            {...err('phone')}
          />
        </>
      ) : (
        <Box>
          <Autocomplete
            options={data?.users.list ?? []}
            loading={loading}
            disabled={disabled}
            filterOptions={(x) => x}
            getOptionLabel={(o) => `${o.firstName} ${o.lastName}`}
            noOptionsText={t('add.noParents')}
            onInputChange={(_, v) => setSearch(v)}
            onChange={(_, o) =>
              o
                ? set({
                    firstName: o.firstName,
                    lastName: o.lastName,
                    phone: phoneDigits(o.phone ?? ''),
                    existingLabel: `${o.firstName} ${o.lastName}`,
                  })
                : set({ firstName: '', lastName: '', phone: '', existingLabel: undefined })
            }
            renderOption={({ key, ...props }, o) => (
              <li key={key} {...props}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {o.firstName} {o.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
                    {o.phone ? formatPhone(o.phone) : o.loginId}
                    {o.links.length > 0 && ` · ${o.links.map((l) => l.fullName).join(', ')}`}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField {...params} placeholder={t('add.findParent')} {...err('existing')} />
            )}
          />
        </Box>
      )}

      <FormField
        id={`${idPrefix}-relation`}
        select
        label={t('add.relation')}
        value={value.relation}
        disabled={disabled}
        onChange={(e) => set({ relation: e.target.value as ParentRelation })}
      >
        {RELATIONS.map((r) => (
          <MenuItem key={r} value={r}>
            {t(`relation.${r}`)}
          </MenuItem>
        ))}
      </FormField>
    </>
  );
}
