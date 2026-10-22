import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'next-i18next/pages';
import { COURSE_PERIOD_GRADES } from '@/apollo/admin/query';
import { PERIODS } from '@/apollo/app/query';
import { Picker } from './Picker';
import { RecordSheet, type Sheet } from './RecordSheet';
import type { TabProps } from './types';
import { courseLabel, useYearCourse, YearCoursePickers } from './YearCoursePickers';

/** Class grades journal: one course, one quarter — the % and the mark of every student */
export function GradesTab({ params, setParams }: TabProps) {
  const { t } = useTranslation('admin');
  const state = useYearCourse({ params });
  const { year, course } = state;
  const periods = useQuery(PERIODS, { skip: !year, variables: { academicYearId: year?.id ?? '' } }).data?.periods ?? [];
  const period = periods.find((p) => p.id === params.period);

  const { data, loading } = useQuery(COURSE_PERIOD_GRADES, {
    skip: !course || !period,
    fetchPolicy: 'cache-and-network',
    variables: { courseId: course?.id ?? '', periodId: period?.id ?? '' },
  });

  const sheet: Sheet | null =
    course && period
      ? {
          report: 'GRADES',
          targetId: course.id,
          title: t('records.docs.GRADES'),
          scope: `${courseLabel(course)} · ${period.name}`,
          header: [
            '#',
            t('users.columns.STUDENT'),
            t('records.col.lastName'),
            t('records.col.firstName'),
            t('records.col.score'),
            t('records.col.mark'),
            t('records.col.gradeStatus'),
          ],
          rows: (data?.coursePeriodGrades ?? []).map((g, i) => [
            i + 1,
            g.loginId,
            g.lastName,
            g.firstName,
            g.score == null ? null : `${g.score}%`,
            g.mark,
            t(g.isPublished ? 'records.published' : 'records.draft'),
          ]),
          monoColumns: [1],
        }
      : null;

  return (
    <RecordSheet
      sheet={sheet}
      loading={loading && !data}
      empty={course && period ? t('records.empty') : t('records.chooseCourse')}
      filters={
        <>
          <YearCoursePickers setParams={setParams} state={state} />
          <Picker
            label={t('records.filters.period')}
            value={period?.id}
            width={160}
            options={[...periods]
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
              .map((p) => ({ value: p.id, label: p.name }))}
            onChange={(id) => setParams({ period: id })}
          />
        </>
      }
    />
  );
}
