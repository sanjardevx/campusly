import type { ReactNode } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Card,
  Checkbox,
  Chip,
  LinearProgress,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Trans, useTranslation } from 'next-i18next/pages';
import type { Role, UsersQuery } from '@/libs/gql/graphql';
import { formatLastSeen, formatPhone } from '@/libs/i18n/format';
import { monoFontFamily } from '@/libs/fonts';
import { type ActionKind, RowMenu } from './BulkBar';
import { PasswordChip, StatusChip } from './UserChips';

export type UserRow = UsersQuery['users']['list'][number];

interface Column {
  key: string;
  label: string;
  render: (u: UserRow) => ReactNode;
}

const mono = { fontFamily: monoFontFamily, fontSize: '0.8125rem', fontWeight: 500, color: 'text.secondary', whiteSpace: 'nowrap' };

/** One table, four column sets: what an admin needs to see differs per role */
export function UsersTable({
  role,
  rows,
  total,
  page,
  limit,
  loading,
  filtered,
  onPage,
  onLimit,
  selectable,
  selected,
  onToggle,
  onToggleAll,
  onAction,
}: {
  role: Role;
  rows: UserRow[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  filtered: boolean;
  onPage: (page: number) => void;
  onLimit: (limit: number) => void;
  /** Checkboxes and ⋮ menus (not on the Admins tab: admins cannot change other admins) */
  selectable: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onAction: (kind: ActionKind, user: UserRow) => void;
}) {
  const { t } = useTranslation('admin');
  const { locale } = useRouter();

  const id: Column = { key: 'id', label: t(`users.columns.${role}`), render: (u) => <Box sx={mono}>{u.loginId}</Box> };
  const name: Column = {
    key: 'name',
    label: t('users.columns.name'),
    render: (u) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {u.firstName} {u.lastName}
      </Typography>
    ),
  };
  const status: Column = { key: 'status', label: t('users.columns.status'), render: (u) => <StatusChip status={u.status} /> };
  const password: Column = {
    key: 'password',
    label: t('users.columns.password'),
    render: (u) => <PasswordChip state={u.passwordState} usesLeft={u.tempPasswordUsesLeft} />,
  };
  const lastSignIn: Column = {
    key: 'lastSignIn',
    label: t('users.columns.lastSignIn'),
    render: (u) => (u.lastActiveAt ? formatLastSeen(u.lastActiveAt, locale, t) : '—'),
  };
  // A student can have two parents: the first one is shown, "+1" says there is another
  const firstLink = (u: UserRow, render: (l: UserRow['links'][number]) => ReactNode) =>
    u.links[0] ? (
      <>
        {render(u.links[0])}
        {u.links.length > 1 && <Box component="span" sx={{ color: 'text.secondary' }}> +{u.links.length - 1}</Box>}
      </>
    ) : (
      '—'
    );

  const columns: Record<Role, Column[]> = {
    STUDENT: [
      id,
      name,
      {
        key: 'class',
        label: t('users.columns.class'),
        render: (u) => (u.className ? <Chip size="small" label={u.className} /> : '—'),
      },
      { key: 'parent', label: t('users.columns.parent'), render: (u) => firstLink(u, (l) => l.fullName) },
      {
        key: 'parentId',
        label: t('users.columns.parentId'),
        render: (u) => firstLink(u, (l) => <Box component="span" sx={mono}>{l.loginId}</Box>),
      },
      status,
      password,
      lastSignIn,
    ],
    TEACHER: [
      id,
      name,
      { key: 'title', label: t('users.columns.title'), render: (u) => u.title ?? '—' },
      status,
      password,
      lastSignIn,
    ],
    PARENT: [
      id,
      name,
      { key: 'phone', label: t('users.columns.phone'), render: (u) => <Box sx={mono}>{u.phone ? formatPhone(u.phone) : '—'}</Box> },
      {
        key: 'children',
        label: t('users.columns.children'),
        render: (u) => (u.links.length ? u.links.map((l) => l.fullName).join(', ') : '—'),
      },
      status,
      password,
      lastSignIn,
    ],
    ADMIN: [id, name, status, lastSignIn],
  };
  const fullName = (u: UserRow) => `${u.firstName} ${u.lastName}`;
  const allChecked = rows.length > 0 && rows.every((u) => selected.has(u.id));
  const someChecked = rows.some((u) => selected.has(u.id));
  const check: Column = {
    key: 'check',
    label: '',
    render: (u) => (
      <Checkbox
        size="small"
        checked={selected.has(u.id)}
        onChange={() => onToggle(u.id)}
        slotProps={{ input: { 'aria-label': t('actions.selectRow', { name: fullName(u) }) } }}
      />
    ),
  };
  const actions: Column = {
    key: 'actions',
    label: t('actions.column'),
    render: (u) => <RowMenu user={u} onAction={(kind) => onAction(kind, u)} />,
  };
  const cols = selectable ? [check, ...columns[role], actions] : columns[role];

  return (
    <Card sx={{ position: 'relative' }}>
      {/* The old page stays on screen while the next one loads: no jump to an empty table */}
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }} />}
      <TableContainer>
        {/* Text may wrap (like Stitch: "Today,⏎07:55"), IDs and chips never do */}
        <Table size="small" sx={{ '& td, & th': { py: 1.25 }, '& .MuiChip-root': { whiteSpace: 'nowrap' } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              {cols.map((c) => (
                <TableCell
                  key={c.key}
                  padding={c.key === 'check' ? 'checkbox' : undefined}
                  align={c.key === 'actions' ? 'right' : undefined}
                  sx={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  {c.key === 'check' ? (
                    // Header box: all rows of THIS page; "–" when only some are picked
                    <Checkbox
                      size="small"
                      checked={allChecked}
                      indeterminate={someChecked && !allChecked}
                      onChange={onToggleAll}
                      slotProps={{ input: { 'aria-label': t('actions.selectAll') } }}
                    />
                  ) : (
                    c.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((u) => (
              <TableRow
                key={u.id}
                hover
                selected={selected.has(u.id)}
                sx={{ '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'rgba(31,78,67,0.06)' } }}
              >
                {cols.map((c) => (
                  <TableCell
                    key={c.key}
                    padding={c.key === 'check' ? 'checkbox' : undefined}
                    align={c.key === 'actions' ? 'right' : undefined}
                  >
                    {c.render(u)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {!rows.length && !loading && (
              <TableRow>
                <TableCell colSpan={cols.length} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  {filtered ? t('users.emptyFiltered') : t('users.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Stitch footer: "Showing 1–25 of 620" · rows per page · numbered pages */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: 'divider', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography variant="body2" color="text.secondary">
          <Trans
            t={t}
            i18nKey="users.showing"
            values={{ from: total ? (page - 1) * limit + 1 : 0, to: Math.min(page * limit, total), total }}
            components={{ b: <Box component="strong" sx={{ color: 'text.primary', fontWeight: 600 }} /> }}
          />
        </Typography>
        <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('users.rowsPerPage')}
            </Typography>
            <Select size="small" value={limit} onChange={(e) => onLimit(Number(e.target.value))} sx={{ fontSize: '0.8125rem' }}>
              {[25, 50, 100].map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </Stack>
          <Pagination
            count={Math.max(1, Math.ceil(total / limit))}
            page={page}
            onChange={(_, p) => onPage(p)}
            shape="rounded"
            size="small"
            color="primary"
          />
        </Stack>
      </Stack>
    </Card>
  );
}
