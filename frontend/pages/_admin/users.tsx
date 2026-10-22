import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Button, Chip, Tab, Tabs } from '@mui/material';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { useTranslation } from 'next-i18next/pages';
import { GROUPS, USER_COUNTS, USERS } from '@/apollo/admin/query';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { AddStudentDrawer } from '@/libs/components/admin/users/AddStudentDrawer';
import { AddTeacherDrawer } from '@/libs/components/admin/users/AddTeacherDrawer';
import { BulkBar } from '@/libs/components/admin/users/BulkBar';
import { ImportStudentsDialog } from '@/libs/components/admin/users/ImportStudentsDialog';
import { gradeOf, PASSWORD_STATES, STATUSES, UsersFilters } from '@/libs/components/admin/users/UsersFilters';
import { UsersTable } from '@/libs/components/admin/users/UsersTable';
import { useUserActions } from '@/libs/components/admin/users/useUserActions';
import { layoutFor } from '@/libs/components/layout';
import type { PasswordState, Role, UserStatus } from '@/libs/gql/graphql';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { useQueryParams } from '@/libs/hooks/useQueryParams';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['admin']);

const ROLES: Role[] = ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'];
const LIMITS = [25, 50, 100];
const COUNT_KEY = { STUDENT: 'students', TEACHER: 'teachers', PARENT: 'parents', ADMIN: 'admins' } as const;
const NONE = new Set<string>();
const ADD_KINDS = ['student', 'teacher', 'import'] as const;

// The URL is typed by hand: anything unknown falls back to a safe default instead of reaching the API
const pick = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
  allowed.includes(value as T) ? (value as T) : undefined;

const UsersPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const [params, setParams] = useQueryParams();

  const role = pick<Role>(params.role, ROLES) ?? 'STUDENT';
  // No status in the URL = Active (Stitch's default view); "ALL" = no status filter
  const status = params.status === 'ALL' ? undefined : (pick<UserStatus>(params.status, STATUSES) ?? 'ACTIVE');
  const students = role === 'STUDENT';
  useCrumb(t(`users.tabs.${role}`));

  // "Grade 9" = every class whose name starts with 9 → their ids go to the API as groupIds
  const groups = useQuery(GROUPS, { skip: !students || !params.grade });
  const groupIds = params.grade
    ? groups.data?.groups.filter((g) => gradeOf(g.name) === params.grade).map((g) => g.id)
    : undefined;
  const passwordState = pick<PasswordState>(params.password, PASSWORD_STATES);
  const page = Math.max(1, Number(params.page) || 1);
  const limit = LIMITS.includes(Number(params.limit)) ? Number(params.limit) : 25;

  const counts = useQuery(USER_COUNTS, { fetchPolicy: 'cache-and-network' });
  const { data, previousData, loading } = useQuery(USERS, {
    fetchPolicy: 'cache-and-network',
    // Wait for the class list, or "Grade 9" would briefly show every student
    skip: students && !!params.grade && !groupIds,
    variables: {
      input: {
        page,
        limit,
        sort: role === 'STUDENT' ? 'loginId' : 'lastName',
        direction: 'ASC',
        search: {
          role,
          text: params.q || undefined,
          groupId: students ? params.group || undefined : undefined,
          groupIds: students ? groupIds : undefined,
          status,
          passwordState: role === 'ADMIN' ? undefined : passwordState,
        },
      },
    },
  });
  const users = (data ?? previousData)?.users;
  const rows = users?.list ?? [];

  // The selection belongs to the view it was made in: on another page, filter or tab nothing is
  // selected, so an action never hits rows the admin cannot see.
  const view = JSON.stringify([role, params.q, params.grade, params.group, status, passwordState, page, limit]);
  const [selection, setSelection] = useState({ view, ids: NONE });
  const selected = selection.view === view ? selection.ids : NONE;
  const select = (ids: Set<string>) => setSelection({ view, ids });
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    select(next);
  };
  const toggleAll = () => select(rows.every((u) => selected.has(u.id)) ? NONE : new Set(rows.map((u) => u.id)));
  const chosen = rows.filter((u) => selected.has(u.id));

  const actions = useUserActions(() => select(NONE));
  const [adding, setAdding] = useState<'student' | 'teacher' | 'import' | null>(null);
  // Dashboard quick actions link here with ?add=student|import: the URL opens the drawer,
  // closing it drops the parameter
  const shown = adding ?? pick(params.add, ADD_KINDS) ?? null;
  const close = () => {
    setAdding(null);
    if (params.add) setParams({ add: undefined });
  };
  // Parents are added with their child; admins cannot be created from the console
  const addKind = role === 'TEACHER' ? 'teacher' : role === 'ADMIN' ? null : 'student';
  const selectable = role !== 'ADMIN';

  return (
    <>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={
          <>
            {students && (
              <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => setAdding('import')}>
                {t('import.button')}
              </Button>
            )}
            {addKind && (
              <Button variant="contained" startIcon={<PersonAddAltOutlinedIcon />} onClick={() => setAdding(addKind)}>
                {t(`add.${addKind}`)}
              </Button>
            )}
          </>
        }
      />
      {/* Mounted only while open: every opening starts with a fresh form */}
      {shown === 'student' && (
        <AddStudentDrawer
          open
          // Looking at 9A? The new student is probably for 9A
          defaultGroupId={students ? params.group : undefined}
          onClose={close}
        />
      )}
      {shown === 'teacher' && <AddTeacherDrawer open onClose={close} />}
      {shown === 'import' && <ImportStudentsDialog open onClose={close} />}

      <Tabs
        value={role}
        // A new tab starts clean: a class or password filter of students means nothing for admins
        onChange={(_, r: Role) =>
          setParams({ role: r === 'STUDENT' ? undefined : r, grade: undefined, group: undefined, password: undefined })
        }
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {ROLES.map((r) => (
          <Tab
            key={r}
            value={r}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {t(`users.tabs.${r}`)}
                <Chip
                  size="small"
                  label={counts.data?.[COUNT_KEY[r]].metaCounter.total ?? '…'}
                  sx={{ height: 20, bgcolor: r === role ? 'primary.light' : 'action.hover' }}
                />
              </Box>
            }
          />
        ))}
      </Tabs>

      <UsersFilters
        key={role}
        role={role}
        value={{ q: params.q, grade: params.grade, group: params.group, status: status ?? 'ALL', password: passwordState }}
        onChange={setParams}
      />

      {actions.element}
      {selectable && chosen.length > 0 && (
        <BulkBar
          count={chosen.length}
          role={role}
          allBlocked={chosen.every((u) => u.status === 'BLOCKED')}
          onAction={(kind) => actions.request(kind, chosen)}
          onClear={() => select(NONE)}
        />
      )}

      <UsersTable
        role={role}
        rows={rows}
        total={users?.metaCounter.total ?? 0}
        page={page}
        limit={limit}
        loading={loading}
        filtered={!!(params.q || params.grade || params.group || status !== 'ACTIVE' || passwordState)}
        onPage={(p) => setParams({ page: p > 1 ? String(p) : undefined })}
        onLimit={(l) => setParams({ limit: l === 25 ? undefined : String(l) })}
        selectable={selectable}
        selected={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
        onAction={(kind, user) => actions.request(kind, [user])}
      />
    </>
  );
};

UsersPage.getLayout = layoutFor('ADMIN');
export default UsersPage;
