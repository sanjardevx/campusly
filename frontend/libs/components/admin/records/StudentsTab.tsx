import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'next-i18next/pages';
import { GROUPS, USERS } from '@/apollo/admin/query';
import { Picker } from './Picker';
import { RecordSheet, type Sheet } from './RecordSheet';
import type { TabProps } from './types';

/** Class list: every active student of one class with their parents (a class is < 100 students) */
export function StudentsTab({ params, setParams }: TabProps) {
  const { t } = useTranslation('admin');
  const groups = useQuery(GROUPS).data?.groups ?? [];
  const group = groups.find((g) => g.id === params.class);

  const { data, loading } = useQuery(USERS, {
    skip: !group,
    fetchPolicy: 'cache-and-network',
    variables: {
      input: { page: 1, limit: 100, sort: 'lastName', direction: 'ASC', search: { role: 'STUDENT', groupId: group?.id, status: 'ACTIVE' } },
    },
  });
  const students = data?.users.list ?? [];

  const sheet: Sheet | null = group
    ? {
        report: 'STUDENTS',
        targetId: group.id,
        title: t('records.docs.STUDENTS'),
        scope: group.name,
        header: [
          '#',
          t('users.columns.STUDENT'),
          t('records.col.lastName'),
          t('records.col.firstName'),
          t('users.columns.parent'),
          t('users.columns.parentId'),
        ],
        rows: students.map((s, i) => [
          i + 1,
          s.loginId,
          s.lastName,
          s.firstName,
          s.links.map((p) => p.fullName).join('; '),
          s.links.map((p) => p.loginId).join('; '),
        ]),
        monoColumns: [1, 5],
      }
    : null;

  return (
    <RecordSheet
      sheet={sheet}
      loading={loading && !data}
      empty={group ? t('records.empty') : t('records.chooseClass')}
      filters={
        <Picker
          label={t('records.filters.class')}
          value={params.class}
          options={groups.map((g) => ({ value: g.id, label: g.name }))}
          onChange={(id) => setParams({ class: id })}
        />
      }
    />
  );
}
