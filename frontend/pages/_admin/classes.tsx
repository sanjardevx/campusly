import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Button, Card, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LibraryAddOutlinedIcon from '@mui/icons-material/LibraryAddOutlined';
import { useTranslation } from 'next-i18next/pages';
import { COURSES, GROUPS } from '@/apollo/admin/query';
import { AddCourseDrawer } from '@/libs/components/admin/classes/AddCourseDrawer';
import { AssignTeacherDialog } from '@/libs/components/admin/classes/AssignTeacherDialog';
import { ClassCard } from '@/libs/components/admin/classes/ClassCard';
import { ClassDialog } from '@/libs/components/admin/classes/ClassDialog';
import { ClassList } from '@/libs/components/admin/classes/ClassList';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { layoutFor } from '@/libs/components/layout';
import type { CoursesQuery } from '@/libs/gql/graphql';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { useQueryParams } from '@/libs/hooks/useQueryParams';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['admin']);

type Open = { kind: 'addClass' } | { kind: 'editClass' } | { kind: 'addCourse' } | { kind: 'assign'; course: CoursesQuery['courses'][number] };

/**
 * Stitch "Classes & Courses": classes of the current year on the left, the chosen class on the right.
 * The choice is in the URL (?class=…&tab=students), so a reload or a shared link opens the same class.
 */
const ClassesPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const [params, setParams] = useQueryParams();
  const [open, setOpen] = useState<Open | null>(null);

  const groups = useQuery(GROUPS, { fetchPolicy: 'cache-and-network' }).data?.groups ?? [];
  // One query for all courses of the year: the class list counts them, the teacher picker too
  const courses = useQuery(COURSES, { fetchPolicy: 'cache-and-network' }).data?.courses ?? [];

  const firstActive = groups.find((g) => g.status === 'ACTIVE') ?? groups[0];
  const group = groups.find((g) => g.id === params.class) ?? firstActive;
  const tab = params.tab === 'students' ? 'students' : 'courses';
  useCrumb(group?.name ?? null);

  const coursesOf = (groupId: string) => courses.filter((c) => c.groupId === groupId);
  const teacherCourses = (teacherId: string) => courses.filter((c) => c.teachers.some((x) => x.id === teacherId)).length;
  const select = (id: string) => setParams({ class: id, tab: undefined });
  // Dashboard "Add course" links here with ?add=course: the drawer opens for the shown class
  const shown: Open | null = open ?? (params.add === 'course' && group?.status === 'ACTIVE' ? { kind: 'addCourse' } : null);
  const close = () => {
    setOpen(null);
    if (params.add) setParams({ add: undefined });
  };

  return (
    <>
      <PageHeader
        title={t('classes.title')}
        subtitle={t('classes.subtitle')}
        actions={
          <>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen({ kind: 'addClass' })}>
              {t('classes.addClass')}
            </Button>
            <Button
              variant="contained"
              startIcon={<LibraryAddOutlinedIcon />}
              disabled={!group || group.status !== 'ACTIVE'}
              onClick={() => setOpen({ kind: 'addCourse' })}
            >
              {t('classes.addCourse')}
            </Button>
          </>
        }
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: { md: 'flex-start' } }}>
        <ClassList groups={groups} courseCount={(id) => coursesOf(id).length} selected={group?.id} onSelect={select} />
        {group ? (
          <ClassCard
            group={group}
            courses={coursesOf(group.id)}
            tab={tab}
            onTab={(next) => setParams({ class: group.id, tab: next === 'students' ? 'students' : undefined })}
            onEdit={() => setOpen({ kind: 'editClass' })}
            onAssign={(course) => setOpen({ kind: 'assign', course })}
          />
        ) : (
          <Card sx={{ flex: 1, p: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">{groups.length ? t('classes.pickClass') : t('classes.noClasses')}</Typography>
          </Card>
        )}
      </Stack>

      {open?.kind === 'addClass' && (
        <ClassDialog
          onClose={() => setOpen(null)}
          onSaved={(id) => {
            setOpen(null);
            select(id);
          }}
        />
      )}
      {open?.kind === 'editClass' && group && (
        <ClassDialog group={group} onClose={() => setOpen(null)} onSaved={() => setOpen(null)} />
      )}
      {shown?.kind === 'addCourse' && group && (
        <AddCourseDrawer group={group} courseCount={teacherCourses} onClose={close} onCreated={close} />
      )}
      {open?.kind === 'assign' && (
        <AssignTeacherDialog course={open.course} courseCount={teacherCourses} onClose={() => setOpen(null)} />
      )}
    </>
  );
};

ClassesPage.getLayout = layoutFor('ADMIN');
export default ClassesPage;
