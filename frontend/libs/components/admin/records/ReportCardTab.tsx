import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'next-i18next/pages';
import { GROUPS, REPORT_CARD, USERS } from '@/apollo/admin/query';
import { Picker } from './Picker';
import { RecordSheet, type Sheet } from './RecordSheet';
import { fullName, type TabProps } from './types';

/**
 * One student's report card for the current quarter. It is a document for the family, so only
 * PUBLISHED grades are on it (the same rule as the student and parent views).
 */
export function ReportCardTab({ params, setParams }: TabProps) {
  const { t } = useTranslation('admin');
  const groups = useQuery(GROUPS).data?.groups ?? [];
  const group = groups.find((g) => g.id === params.class);
  const students =
    useQuery(USERS, {
      skip: !group,
      variables: {
        input: { page: 1, limit: 100, sort: 'lastName', direction: 'ASC', search: { role: 'STUDENT', groupId: group?.id, status: 'ACTIVE' } },
      },
    }).data?.users.list ?? [];
  const student = students.find((s) => s.id === params.student);

  const { data, loading } = useQuery(REPORT_CARD, {
    skip: !student,
    fetchPolicy: 'cache-and-network',
    variables: { studentId: student?.id ?? '' },
  });
  const card = data?.studentOverview;

  const sheet: Sheet | null =
    student && card
      ? {
          report: 'REPORT_CARD',
          targetId: student.id,
          title: t('records.docs.REPORT_CARD'),
          scope: [fullName(card.student), card.student.loginId, card.student.className, card.period?.name]
            .filter(Boolean)
            .join(' · '),
          header: [
            t('records.col.course'),
            t('records.col.teacher'),
            t('records.col.score'),
            t('records.col.mark'),
            t('records.col.attendance'),
          ],
          rows: card.courses.map((c) => [
            c.title,
            c.teacherName,
            c.isPublished && c.score != null ? `${c.score}%` : t('records.notPublished'),
            c.isPublished ? c.mark : null,
            c.attendanceRate == null ? null : `${c.attendanceRate}%`,
          ]),
          note:
            card.attendance.rate == null
              ? undefined
              : t('records.attendanceTotal', { rate: card.attendance.rate, absent: card.attendance.absent }),
        }
      : null;

  return (
    <RecordSheet
      sheet={sheet}
      loading={loading && !data}
      empty={student ? t('records.empty') : t('records.chooseStudent')}
      filters={
        <>
          <Picker
            label={t('records.filters.class')}
            value={group?.id}
            width={140}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
            onChange={(id) => setParams({ class: id, student: undefined })}
          />
          <Picker
            label={t('records.filters.student')}
            value={student?.id}
            width={240}
            options={students.map((s) => ({ value: s.id, label: `${fullName(s)} · ${s.loginId}` }))}
            onChange={(id) => setParams({ student: id })}
          />
        </>
      }
    />
  );
}
