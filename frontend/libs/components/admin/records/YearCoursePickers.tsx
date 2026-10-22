import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'next-i18next/pages';
import { ACADEMIC_YEARS, RECORD_COURSES } from '@/apollo/admin/query';
import { Picker } from './Picker';
import type { TabProps } from './types';

/** "Algebra · 9A" already names its class; a title without it gets the class in front */
export const courseLabel = (c: { title: string; groupName: string }) =>
  c.title.includes(c.groupName) ? c.title : `${c.groupName} · ${c.title}`;

/**
 * Year + course: the grades and attendance journals of past years stay reachable.
 * No year in the URL = the current year.
 */
export function useYearCourse({ params }: Pick<TabProps, 'params'>) {
  const years = useQuery(ACADEMIC_YEARS).data?.academicYears ?? [];
  const year = years.find((y) => y.id === params.year) ?? years.find((y) => y.isCurrent) ?? years[0];
  const courses =
    useQuery(RECORD_COURSES, { skip: !year, variables: { filter: { academicYearId: year?.id } } }).data?.courses ?? [];
  const course = courses.find((c) => c.id === params.course);
  return { years, year, courses, course };
}

export function YearCoursePickers({
  setParams,
  state,
}: Pick<TabProps, 'setParams'> & { state: ReturnType<typeof useYearCourse> }) {
  const { t } = useTranslation('admin');
  return (
    <>
      <Picker
        label={t('records.filters.year')}
        value={state.year?.id}
        width={140}
        options={state.years.map((y) => ({ value: y.id, label: y.name }))}
        // Another year has other courses and quarters: those choices start over
        onChange={(id) => setParams({ year: id, course: undefined, period: undefined, from: undefined, to: undefined })}
      />
      <Picker
        label={t('records.filters.course')}
        value={state.course?.id}
        width={240}
        options={state.courses.map((c) => ({ value: c.id, label: courseLabel(c) }))}
        onChange={(id) => setParams({ course: id })}
      />
    </>
  );
}
