import { useQuery } from '@apollo/client/react';
import { TextField } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { ATTENDANCE_JOURNAL } from '@/apollo/admin/query';
import type { AttendanceStatus } from '@/libs/gql/graphql';
import { RecordSheet, type Sheet } from './RecordSheet';
import type { TabProps } from './types';
import { courseLabel, useYearCourse, YearCoursePickers } from './YearCoursePickers';

const STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "Today" on the admin's clock as YYYY-MM-DD */
const today = () => new Date().toLocaleDateString('en-CA');

/** Attendance journal: one course over a date range — one letter per day, totals at the end */
export function AttendanceTab({ params, setParams }: TabProps) {
  const { t } = useTranslation('admin');
  const state = useYearCourse({ params });
  const { year, course } = state;

  // Default range: the whole year up to today
  const from = params.from && DATE.test(params.from) ? params.from : year?.startsAt.slice(0, 10);
  const yearEnd = year?.endsAt.slice(0, 10) ?? '';
  const to = params.to && DATE.test(params.to) ? params.to : today() < yearEnd ? today() : yearEnd;
  const valid = !!from && !!to && from <= to;

  const { data, loading, error } = useQuery(ATTENDANCE_JOURNAL, {
    skip: !course || !valid,
    fetchPolicy: 'cache-and-network',
    variables: { courseId: course?.id ?? '', from: from ?? '', to },
  });
  const journal = data?.attendanceJournal;
  const letter = (s: AttendanceStatus) => t(`records.letter.${s}`);

  const sheet: Sheet | null =
    course && journal && !error
      ? {
          report: 'ATTENDANCE',
          targetId: course.id,
          title: t('records.docs.ATTENDANCE'),
          scope: `${courseLabel(course)} · ${from} – ${to}`,
          header: [
            t('users.columns.STUDENT'),
            t('records.col.name'),
            // "2026-10-05" → "05.10": short enough for a column per day
            ...journal.dates.map((d) => `${d.slice(8, 10)}.${d.slice(5, 7)}`),
            letter('ABSENT'),
            letter('LATE'),
            t('records.col.rate'),
          ],
          rows: journal.rows.map((r) => {
            const count = (s: AttendanceStatus) => r.statuses.filter((x) => x === s).length;
            const attended = r.statuses.length - count('ABSENT');
            return [
              r.loginId,
              `${r.lastName} ${r.firstName}`,
              ...r.statuses.map(letter),
              count('ABSENT'),
              count('LATE'),
              // Same rule as the server: an excused absence does not lower the rate
              r.statuses.length ? `${Math.round((attended / r.statuses.length) * 100)}%` : null,
            ];
          }),
          note: STATUSES.map((s) => `${letter(s)} = ${t(`records.status.${s}`)}`).join(', '),
          monoColumns: [0],
        }
      : null;

  const dateField = (key: 'from' | 'to', value: string | undefined) => (
    <TextField
      type="date"
      size="small"
      label={t(`records.filters.${key}`)}
      value={value ?? ''}
      error={!valid}
      onChange={(e) => setParams({ [key]: e.target.value })}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: { min: year?.startsAt.slice(0, 10), max: yearEnd },
      }}
      sx={{ width: { xs: '100%', sm: 160 } }}
    />
  );

  return (
    <RecordSheet
      sheet={sheet}
      loading={loading && !data}
      empty={!course ? t('records.chooseCourse') : !valid ? t('records.badRange') : t('records.emptyAttendance')}
      filters={
        <>
          <YearCoursePickers setParams={setParams} state={state} />
          {dateField('from', from)}
          {dateField('to', to)}
        </>
      }
    />
  );
}
