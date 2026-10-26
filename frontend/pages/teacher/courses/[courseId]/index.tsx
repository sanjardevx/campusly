import { useMemo, useState } from 'react';
import type { GetStaticPaths } from 'next';
import { useRouter } from 'next/router';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Button, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'next-i18next/pages';
import { COURSE_ASSIGNMENTS, COURSE_FILE_URL, COURSE_PERIODS, TEACHER_COURSE, TEACHER_LESSON_VIDEO } from '@/apollo/teacher/query';
import { PUBLISH_ASSIGNMENT, PUBLISH_LESSON, PUBLISH_MODULE, REORDER_LESSONS, REORDER_MODULES, UPDATE_MODULE } from '@/apollo/teacher/mutation';
import { layoutFor } from '@/libs/components/layout';
import { AssignmentsTab } from '@/libs/components/teacher/course/AssignmentsTab';
import { CourseHeader, type CourseTab } from '@/libs/components/teacher/course/CourseHeader';
import { HomeworkDrawer } from '@/libs/components/teacher/course/HomeworkDrawer';
import { QuizDrawer } from '@/libs/components/teacher/course/QuizDrawer';
import { LessonDrawer } from '@/libs/components/teacher/course/LessonDrawer';
import { todayLocal, visibility, weekItems, weekState, type Assignment, type Lesson, type Week, type WeekItem } from '@/libs/components/teacher/course/model';
import { useDragList } from '@/libs/components/teacher/course/useDragList';
import { WeekCard, type AddKind, type WeekActions } from '@/libs/components/teacher/course/WeekCard';
import { WeekDialog } from '@/libs/components/teacher/course/WeekDialog';
import { errorCode } from '@/libs/errors';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { useErrorText } from '@/libs/i18n';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });
export const getStaticProps = withTranslations(['teacher']);

const REFETCH = { refetchQueries: ['TeacherCourse'] };

type Drawer =
  | { kind: 'week'; week: Week | null }
  | { kind: 'lesson'; week: Week; type: Lesson['type']; lesson: Lesson | null }
  | { kind: 'homework'; week: Week | null; assignment: Assignment | null }
  | { kind: 'quiz'; week: Week | null; assignment: Assignment | null }
  | null;

/**
 * Stitch "Course: Algebra 9A (Edit Mode)" + "New Homework Drawer". Weeks hold lessons and
 * assignments; edit mode adds the controls, Student Preview shows only what students see.
 * Every change is checked on the server (the teacher of this course, not archived).
 */
const CoursePage: NextPageWithLayout = () => {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const router = useRouter();
  const client = useApolloClient();
  const courseId = typeof router.query.courseId === 'string' ? router.query.courseId : '';
  const tab: CourseTab = router.query.tab === 'assignments' ? 'assignments' : 'lessons';
  // In the URL, so a reload keeps edit mode on
  const editRequested = router.query.edit === '1';
  const [preview, setPreview] = useState(false);
  const [drawer, setDrawer] = useState<Drawer>(null);
  // Weeks the teacher opened or closed; the others follow the default (the current week open)
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const { data, error } = useQuery(TEACHER_COURSE, { variables: { courseId }, skip: !courseId, fetchPolicy: 'cache-and-network' });
  const { data: assignmentData } = useQuery(COURSE_ASSIGNMENTS, { variables: { courseId }, skip: !courseId, fetchPolicy: 'cache-and-network' });
  const course = data?.courseDetail;
  const { data: periodData } = useQuery(COURSE_PERIODS, { variables: { academicYearId: course?.academicYearId ?? '' }, skip: !course });
  useCrumb(course?.title ?? null);

  const fail = (err: unknown) => setToast(errorText(errorCode(err)));
  const [updateModule] = useMutation(UPDATE_MODULE, REFETCH);
  const [publishModule] = useMutation(PUBLISH_MODULE, REFETCH);
  const [reorderModules] = useMutation(REORDER_MODULES, REFETCH);
  const [publishLesson] = useMutation(PUBLISH_LESSON, REFETCH);
  const [reorderLessons] = useMutation(REORDER_LESSONS, REFETCH);
  const [publishAssignment] = useMutation(PUBLISH_ASSIGNMENT, { refetchQueries: ['CourseAssignments'] });

  const editMode = editRequested && !preview && course?.status !== 'ARCHIVED';
  const assignments = useMemo(() => assignmentData?.courseAssignments ?? [], [assignmentData]);
  const today = todayLocal();

  // Student Preview: what a student of this course sees (DECISIONS §8 rules, applied here only for show)
  const weeks = useMemo(() => {
    const all = course?.modules ?? [];
    if (!preview) return all;
    return all
      .filter((w) => visibility(w.publishedAt) === 'PUBLISHED' && !w.isHidden)
      .map((w) => ({ ...w, lessons: w.lessons.filter((l) => visibility(l.publishedAt) === 'PUBLISHED') }));
  }, [course, preview]);
  const visibleAssignments = preview ? assignments.filter((a) => visibility(a.publishedAt) === 'PUBLISHED') : assignments;

  // Open by default: the current week (or the first one)
  const defaultOpen = (course?.modules.find((w) => weekState(w, today) === 'CURRENT') ?? course?.modules[0])?.id;
  const isOpen = (id: string) => opened[id] ?? id === defaultOpen;

  const weekIds = weeks.map((w) => w.id);
  const weekDrag = useDragList(weekIds, (ids) => reorderModules({ variables: { input: { parentId: courseId, ids } } }).catch(fail));

  // The leaf period (quarter) today is in, and the course week (module) of today
  const period = useMemo(() => {
    const periods = periodData?.periods ?? [];
    const parents = new Set(periods.map((p) => p.parentId).filter(Boolean));
    return periods.find((p) => !parents.has(p.id) && p.startsAt <= today && p.endsAt >= today)?.name ?? null;
  }, [periodData, today]);
  const currentWeek = course?.modules.find((w) => weekState(w, today) === 'CURRENT')?.order ?? null;

  const setQuery = (patch: Record<string, string | undefined>) => {
    const query = { ...router.query, ...patch };
    for (const key of Object.keys(query)) if (query[key] === undefined) delete query[key];
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false });
  };

  /** Lesson files and videos open in a new tab through a short-lived link */
  const openItem = async (item: WeekItem) => {
    if (item.kind === 'assignment') {
      void router.push(`/teacher/courses/${courseId}/assignments/${item.assignment.id}`);
      return;
    }
    const { lesson } = item;
    if (lesson.type === 'LINK' && lesson.body) {
      window.open(lesson.body, '_blank', 'noopener');
      return;
    }
    if (lesson.type === 'READING' || !lesson.file) {
      setDrawer({ kind: 'lesson', week: weeks.find((w) => w.id === lesson.moduleId)!, type: lesson.type, lesson });
      return;
    }
    // Opened before the await, so the browser does not block it as a pop-up
    const tabRef = window.open('', '_blank');
    try {
      const url =
        lesson.type === 'VIDEO'
          ? (await client.query({ query: TEACHER_LESSON_VIDEO, variables: { lessonId: lesson.id }, fetchPolicy: 'network-only' })).data!.lessonVideo.url
          : (await client.query({ query: COURSE_FILE_URL, variables: { assetId: lesson.file.id }, fetchPolicy: 'network-only' })).data!.courseFileUrl.url;
      if (tabRef) tabRef.location.href = url;
    } catch (err) {
      tabRef?.close();
      fail(err);
    }
  };

  const actions: WeekActions = {
    onEditWeek: (week) => setDrawer({ kind: 'week', week }),
    onWeekHidden: (week, hidden) => void updateModule({ variables: { input: { id: week.id, isHidden: hidden } } }).catch(fail),
    onWeekPublish: (week, publish) => void publishModule({ variables: { input: { id: week.id, publish } } }).catch(fail),
    onAdd: (week: Week, kind: AddKind) =>
      setDrawer(
        kind === 'HOMEWORK'
          ? { kind: 'homework', week, assignment: null }
          : kind === 'QUIZ'
            ? { kind: 'quiz', week, assignment: null }
            : { kind: 'lesson', week, type: kind, lesson: null },
      ),
    onEditItem: (item) =>
      setDrawer(
        item.kind === 'lesson'
          ? { kind: 'lesson', week: weeks.find((w) => w.id === item.lesson.moduleId)!, type: item.lesson.type, lesson: item.lesson }
          : {
              kind: item.assignment.type === 'QUIZ' ? 'quiz' : 'homework',
              week: weeks.find((w) => w.id === item.assignment.moduleId) ?? null,
              assignment: item.assignment,
            },
      ),
    onItemPublish: (item, publish) =>
      void (
        item.kind === 'lesson'
          ? publishLesson({ variables: { input: { id: item.lesson.id, publish } } })
          : publishAssignment({ variables: { input: { id: item.assignment.id, publish } } })
      ).catch(fail),
    onOpenItem: (item) => void openItem(item),
    onLessonsReorder: (week, ids) => void reorderLessons({ variables: { input: { parentId: week.id, ids } } }).catch(fail),
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 560 }}>
        {errorText(errorCode(error))}
      </Alert>
    );
  }
  if (!course) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const toggle = (id: string) => setOpened((all) => ({ ...all, [id]: !isOpen(id) }));

  return (
    <Stack spacing={2} sx={{ maxWidth: 1040, mx: 'auto' }}>
      <CourseHeader
        course={course}
        period={period}
        week={currentWeek}
        assignmentCount={visibleAssignments.length}
        tab={tab}
        editMode={editMode}
        preview={preview}
        onTab={(next) => setQuery({ tab: next === 'lessons' ? undefined : next })}
        onEditMode={(on) => setQuery({ edit: on ? '1' : undefined })}
        onPreview={setPreview}
      />

      {editMode && (
        <Stack
          direction="row"
          sx={{ gap: 1.25, alignItems: 'center', px: 2, py: 1.25, borderRadius: 3, border: 1, borderColor: (th) => `${th.palette.warning.main}55`, bgcolor: 'warning.light', color: 'warning.dark' }}
        >
          <InfoOutlinedIcon fontSize="small" />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>{t('course.editBanner')}</Typography>
        </Stack>
      )}
      {preview && (
        <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => setPreview(false)}>{t('course.previewExit')}</Button>}>
          {t('course.previewBanner')}
        </Alert>
      )}

      {tab === 'assignments' ? (
        <AssignmentsTab courseId={course.id} assignments={visibleAssignments} weeks={weeks} editMode={editMode} onNew={() => setDrawer({ kind: 'homework', week: null, assignment: null })} />
      ) : (
        <Stack spacing={2}>
          {weeks.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              {preview ? t('course.previewEmpty') : t('course.noWeeks')}
            </Typography>
          )}
          {weeks.map((week, i) => (
            <Box key={week.id} {...(editMode ? weekDrag.rowProps(week.id) : {})} sx={{ borderRadius: '12px', '&[data-dragging]': { opacity: 0.45 }, '&[data-over]': { outline: 2, outlineColor: 'primary.main' } }}>
              <WeekCard
                week={week}
                items={weekItems(week, visibleAssignments)}
                courseId={course.id}
                expanded={isOpen(week.id)}
                editMode={editMode}
                actions={actions}
                dragHandle={weekDrag.handleProps(week.id)}
                moveMenu={{ up: i > 0 ? () => weekDrag.moveUp(week.id) : null, down: i < weeks.length - 1 ? () => weekDrag.moveDown(week.id) : null }}
                onToggle={() => toggle(week.id)}
              />
            </Box>
          ))}
          {editMode && (
            <Button
              fullWidth
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => setDrawer({ kind: 'week', week: null })}
              sx={{ py: 1.5, border: '2px dashed', borderColor: 'divider', borderRadius: '12px', bgcolor: 'background.paper', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}
            >
              {t('course.week.add')}
            </Button>
          )}
        </Stack>
      )}

      {drawer?.kind === 'week' && <WeekDialog courseId={course.id} week={drawer.week} weeks={course.modules} onClose={() => setDrawer(null)} />}
      {drawer?.kind === 'lesson' && <LessonDrawer courseId={course.id} week={drawer.week} type={drawer.type} lesson={drawer.lesson} onClose={() => setDrawer(null)} />}
      {drawer?.kind === 'homework' && <HomeworkDrawer courseId={course.id} week={drawer.week} assignment={drawer.assignment} onClose={() => setDrawer(null)} />}
      {drawer?.kind === 'quiz' && <QuizDrawer courseId={course.id} week={drawer.week} assignment={drawer.assignment} onClose={() => setDrawer(null)} />}

      <Snackbar open={!!toast} autoHideDuration={6000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setToast(null)} variant="filled">
          {toast}
        </Alert>
      </Snackbar>
    </Stack>
  );
};

CoursePage.getLayout = layoutFor('TEACHER');
export default CoursePage;
