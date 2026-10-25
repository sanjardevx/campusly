import { Fragment, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Card,
  Collapse,
  IconButton,
  Link,
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
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Trans, useTranslation } from 'next-i18next/pages';
import type { AuditLogsQuery } from '@/libs/gql/graphql';
import { monoFontFamily } from '@/libs/fonts';
import { formatDateTime } from '@/libs/i18n/format';

export type ActivityRow = AuditLogsQuery['auditLogs']['list'][number];
export type ActivityActor = NonNullable<ActivityRow['actor']>;

export const LIMITS = [25, 50, 100];

const mono = { fontFamily: monoFontFamily, fontSize: '0.8125rem', color: 'text.secondary' };

/** "field: before → after" lines of one row (a create has no "before") */
function Changes({ row }: { row: ActivityRow }) {
  const { t } = useTranslation('admin');
  if (!row.changes.length) {
    return <Typography variant="body2" color="text.secondary">{t('activity.noChanges')}</Typography>;
  }
  return (
    <Stack spacing={0.75}>
      {row.changes.map((c) => (
        <Stack key={c.field} direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Box sx={{ ...mono, color: 'text.primary', fontWeight: 600, minWidth: 140 }}>{c.field}</Box>
          {c.before !== null && (
            <>
              <Box sx={{ ...mono, textDecoration: 'line-through', wordBreak: 'break-word' }}>{c.before}</Box>
              <ArrowRightAltIcon sx={{ fontSize: 16, color: 'text.secondary', alignSelf: 'center' }} />
            </>
          )}
          <Box sx={{ ...mono, color: 'text.primary', wordBreak: 'break-word' }}>{c.after ?? t('activity.empty')}</Box>
        </Stack>
      ))}
    </Stack>
  );
}

/**
 * The activity log table: newest first, one line per action; a row opens to show what changed.
 * Clicking a person shows only their actions.
 */
export function ActivityTable({
  rows,
  total,
  page,
  limit,
  loading,
  filtered,
  onPage,
  onLimit,
  onActor,
}: {
  rows: ActivityRow[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  filtered: boolean;
  onPage: (page: number) => void;
  onLimit: (limit: number) => void;
  onActor: (actor: ActivityActor) => void;
}) {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { locale } = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Card variant="outlined">
      {loading && <LinearProgress sx={{ height: 2 }} />}
      <TableContainer>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40 }} />
              <TableCell>{t('activity.col.when')}</TableCell>
              <TableCell>{t('activity.col.who')}</TableCell>
              <TableCell>{t('activity.col.action')}</TableCell>
              <TableCell>{t('activity.col.target')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const expanded = open === row.id;
              return (
                <Fragment key={row.id}>
                  <TableRow hover onClick={() => setOpen(expanded ? null : row.id)} sx={{ cursor: 'pointer', '& > td': { borderBottom: expanded ? 0 : undefined } }}>
                    <TableCell>
                      <IconButton
                        size="small"
                        aria-label={t('activity.details')}
                        aria-expanded={expanded}
                        sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease-out' }}
                      >
                        <KeyboardArrowDownIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Box sx={mono}>{formatDateTime(row.createdAt, locale)}</Box>
                    </TableCell>
                    <TableCell>
                      {row.actor ? (
                        <Box>
                          <Link
                            component="button"
                            type="button"
                            underline="hover"
                            onClick={(e) => {
                              // Filter by this person, without opening the row
                              e.stopPropagation();
                              onActor(row.actor!);
                            }}
                            sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.primary', textAlign: 'left' }}
                          >
                            {row.actor.firstName} {row.actor.lastName}
                          </Link>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {tc(`roles.${row.actor.role}`)} · {row.actor.loginId}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {t('activity.system')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{t(`activity.actions.${row.action}`, { defaultValue: row.action })}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {row.target ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t(`activity.entities.${row.entityType}`, { defaultValue: row.entityType })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 0, bgcolor: expanded ? 'action.hover' : undefined }}>
                      <Collapse in={expanded} unmountOnExit>
                        <Box sx={{ py: 2, pl: 6 }}>
                          <Changes row={row} />
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                  {filtered ? t('activity.emptyFiltered') : t('activity.emptyLog')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
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
              {LIMITS.map((n) => (
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
