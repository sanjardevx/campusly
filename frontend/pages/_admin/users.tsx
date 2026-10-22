import { useQuery } from '@apollo/client/react';
import { Box, Chip, Tab, Tabs } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { GROUPS, USER_COUNTS, USERS } from '@/apollo/admin/query';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { gradeOf, PASSWORD_STATES, STATUSES, UsersFilters } from '@/libs/components/admin/users/UsersFilters';
import { UsersTable } from '@/libs/components/admin/users/UsersTable';
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

  return (
    <>
      <PageHeader title={t('users.title')} subtitle={t('users.subtitle')} />

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

      <UsersTable
        role={role}
        rows={users?.list ?? []}
        total={users?.metaCounter.total ?? 0}
        page={page}
        limit={limit}
        loading={loading}
        filtered={!!(params.q || params.grade || params.group || status !== 'ACTIVE' || passwordState)}
        onPage={(p) => setParams({ page: p > 1 ? String(p) : undefined })}
        onLimit={(l) => setParams({ limit: l === 25 ? undefined : String(l) })}
      />
    </>
  );
};

UsersPage.getLayout = layoutFor('ADMIN');
export default UsersPage;
