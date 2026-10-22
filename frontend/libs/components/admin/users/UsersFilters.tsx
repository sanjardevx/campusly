import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Button, Card, InputAdornment, ListItemIcon, Menu, MenuItem, Stack, TextField } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'next-i18next/pages';
import { GROUPS } from '@/apollo/admin/query';
import { useDebounce } from '@/libs/hooks/useDebounce';
import type { PasswordState, Role, UserStatus } from '@/libs/gql/graphql';

export const STATUSES: UserStatus[] = ['ACTIVE', 'BLOCKED', 'ARCHIVED'];
export const PASSWORD_STATES: PasswordState[] = ['SET', 'TEMPORARY', 'EXPIRED', 'MUST_CHANGE'];

/** "9A" → "9", "10B" → "10": the grade is the number a class name starts with */
export const gradeOf = (className: string) => /^(\d+)/.exec(className)?.[1];

// A type, not an interface: it must fit the URL params' Record<string, string | undefined>
export type UserFilters = {
  q?: string;
  grade?: string;
  group?: string;
  /** A status, or 'ALL' (every status). Active is the default view */
  status?: string;
  password?: string;
};

interface Option {
  value: string;
  label: string;
  /** Shorter text for the button ("Grade: 9"), the list shows `label` ("Grade 9") */
  short?: string;
}

/** Stitch filter: a quiet "Status: Active ▾" button that opens a list */
function FilterMenu({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: Option[];
  allLabel: string;
  onChange: (value: string | undefined) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const selected = options.find((o) => o.value === value);
  const current = selected ? (selected.short ?? selected.label) : allLabel;
  const choose = (v: string | undefined) => {
    setAnchor(null);
    onChange(v);
  };
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        endIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ fontWeight: 500, fontSize: '0.8125rem', whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        {label}: {current}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {[{ value: undefined, label: allLabel }, ...options].map((o) => (
          <MenuItem key={o.value ?? ''} selected={o.value === value} onClick={() => choose(o.value)}>
            <ListItemIcon>{o.value === value && <CheckIcon fontSize="small" />}</ListItemIcon>
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** Search + filters. The search box keeps its own text and sends it 300 ms after typing stops */
export function UsersFilters({
  role,
  value,
  onChange,
}: {
  role: Role;
  value: UserFilters;
  onChange: (patch: UserFilters) => void;
}) {
  const { t } = useTranslation('admin');
  const { data } = useQuery(GROUPS, { skip: role !== 'STUDENT' });
  const [text, setText] = useState(value.q ?? '');
  const debounced = useDebounce(text.trim());

  // Typed text → URL (only when it really changed, so "Clear filters" is not undone)
  useEffect(() => {
    if (debounced !== (value.q ?? '')) onChange({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs only for the debounced text
  }, [debounced]);

  const groups = data?.groups ?? [];
  const grades = [...new Set(groups.map((g) => gradeOf(g.name)).filter((g) => g !== undefined))].sort(
    (a, b) => Number(a) - Number(b),
  );
  // Picking a grade narrows the class list to that grade
  const classes = groups.filter((g) => !value.grade || gradeOf(g.name) === value.grade);
  const all = t('users.filters.all');
  const hasFilters = !!(value.q || value.grade || value.group || value.status !== 'ACTIVE' || value.password);

  return (
    <Card sx={{ p: 1.5, mb: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ alignItems: { md: 'center' }, flexWrap: 'wrap' }}
      >
        <TextField
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t(`users.search.${role}`)}
          sx={{
            maxWidth: { md: 320 },
            '& .MuiOutlinedInput-root': { bgcolor: 'background.default' },
            '& .MuiOutlinedInput-root.Mui-focused': { bgcolor: 'background.paper' },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        {role === 'STUDENT' && (
          <>
            <FilterMenu
              label={t('users.filters.grade')}
              value={value.grade}
              allLabel={all}
              options={grades.map((g) => ({ value: g, label: t('users.filters.gradeN', { n: g }), short: g }))}
              // A class of another grade would make the result empty: drop it
              onChange={(grade) => onChange({ grade, group: undefined })}
            />
            <FilterMenu
              label={t('users.filters.class')}
              value={value.group}
              allLabel={all}
              options={classes.map((g) => ({ value: g.id, label: g.name }))}
              onChange={(group) => onChange({ group })}
            />
          </>
        )}
        <FilterMenu
          label={t('users.filters.status')}
          value={value.status === 'ALL' ? undefined : value.status}
          allLabel={all}
          options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
          // Active is the default and needs no URL param; "All" does
          onChange={(status) => onChange({ status: status === 'ACTIVE' ? undefined : (status ?? 'ALL') })}
        />
        {role !== 'ADMIN' && (
          <FilterMenu
            label={t('users.filters.password')}
            value={value.password}
            allLabel={all}
            options={PASSWORD_STATES.map((s) => ({ value: s, label: t(`password.${s}`) }))}
            onChange={(password) => onChange({ password })}
          />
        )}
        <Button
          variant="text"
          size="small"
          disabled={!hasFilters}
          onClick={() => {
            setText('');
            onChange({ q: undefined, grade: undefined, group: undefined, status: undefined, password: undefined });
          }}
          sx={{ ml: { md: 'auto' }, color: 'text.secondary', fontWeight: 500 }}
        >
          {t('users.filters.clear')}
        </Button>
      </Stack>
    </Card>
  );
}
