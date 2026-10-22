import { useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Alert, MenuItem, TextField } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { BLOCK_USER, MOVE_STUDENT, RESET_PASSWORD, UNBLOCK_USER } from '@/apollo/admin/mutation';
import { GROUPS } from '@/apollo/admin/query';
import { ConfirmDialog } from '@/libs/components/admin/ConfirmDialog';
import { type Slip, SlipsDialog } from '@/libs/components/admin/LoginSlips';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import type { ActionKind } from './BulkBar';
import type { UserRow } from './UsersTable';

interface Report {
  done: number;
  count: number;
  failed: { name: string; code: string }[];
}

/**
 * Users page actions: confirm → run for each user → report → (passwords) login slips.
 * One mutation per user, one after another: each is its own transaction with its own AuditLog
 * row on the server, and one failure (e.g. FORBIDDEN on an admin) does not stop the others.
 */
export function useUserActions(onFinished: () => void) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const client = useApolloClient();
  const [pending, setPending] = useState<{ kind: ActionKind; users: UserRow[] } | null>(null);
  const [moveTo, setMoveTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [slips, setSlips] = useState<{ list: Slip[]; print: boolean } | null>(null);
  const groups = useQuery(GROUPS, { skip: pending?.kind !== 'move' });

  const runOne = async (kind: ActionKind, user: UserRow): Promise<Slip | null> => {
    switch (kind) {
      case 'reset':
      case 'print': {
        // no-cache: the plain password must not stay in Apollo's cache after the dialog closes
        const { data } = await client.mutate({
          mutation: RESET_PASSWORD,
          variables: { userId: user.id },
          fetchPolicy: 'no-cache',
        });
        return data?.resetPassword ?? null;
      }
      case 'block':
        await client.mutate({ mutation: BLOCK_USER, variables: { userId: user.id } });
        return null;
      case 'unblock':
        await client.mutate({ mutation: UNBLOCK_USER, variables: { userId: user.id } });
        return null;
      case 'move':
        await client.mutate({ mutation: MOVE_STUDENT, variables: { input: { studentId: user.id, groupId: moveTo } } });
        return null;
    }
  };

  const run = async () => {
    if (!pending) return;
    setBusy(true);
    const result: Report = { done: 0, count: pending.users.length, failed: [] };
    const newSlips: Slip[] = [];
    for (const user of pending.users) {
      try {
        const slip = await runOne(pending.kind, user);
        if (slip) newSlips.push(slip);
        result.done += 1;
      } catch (err) {
        result.failed.push({ name: `${user.firstName} ${user.lastName}`, code: errorCode(err) });
      }
    }
    // The table, the tab counters and the class sizes changed
    await client.refetchQueries({ include: ['Users', 'UserCounts', 'Groups'] });
    setBusy(false);
    setReport(result);
    if (newSlips.length) setSlips({ list: newSlips, print: pending.kind === 'print' });
    setPending(null);
    onFinished();
  };

  const request = (kind: ActionKind, users: UserRow[]) => {
    if (!users.length) return;
    setReport(null);
    setMoveTo('');
    setPending({ kind, users });
  };

  const kind = pending?.kind;
  const count = pending?.users.length ?? 0;
  // Students already in the chosen class are not a problem: the server says so per student
  const element = (
    <>
      {report && (
        <Alert
          severity={report.failed.length ? 'warning' : 'success'}
          onClose={() => setReport(null)}
          sx={{ mb: 2 }}
        >
          {t('result.done', { done: report.done, count: report.count })}
          {report.failed.length > 0 && (
            <>
              {' '}
              {t('result.failed', { count: report.failed.length })}{' '}
              {report.failed.map((f) => `${f.name} — ${errorText(f.code)}`).join('; ')}
            </>
          )}
        </Alert>
      )}
      <ConfirmDialog
        open={!!pending}
        title={kind ? t(`confirm.${kind}Title`) : ''}
        body={kind ? t(`confirm.${kind}Body`, { count }) : ''}
        confirmLabel={kind ? t(`confirm.${kind}`) : ''}
        danger={kind === 'block'}
        busy={busy}
        disabled={kind === 'move' && !moveTo}
        onConfirm={() => void run()}
        onClose={() => setPending(null)}
      >
        {kind === 'move' && (
          <TextField select label={t('confirm.moveTarget')} value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
            {(groups.data?.groups ?? [])
              .filter((g) => g.status === 'ACTIVE')
              .map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
          </TextField>
        )}
      </ConfirmDialog>
      <SlipsDialog slips={slips?.list ?? null} autoPrint={slips?.print} onClose={() => setSlips(null)} />
    </>
  );

  return { request, element };
}
