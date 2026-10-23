import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CheckIcon from '@mui/icons-material/Check';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'next-i18next/pages';
import { MARK_ATTENDANCE } from '@/apollo/teacher/mutation';
import { TEACHER_ATTENDANCE, TEACHING_COURSES } from '@/apollo/teacher/query';
import { layoutFor } from '@/libs/components/layout';
import { Pill } from '@/libs/components/teacher/dashboard/parts';
import { dayDate, todayLocal } from '@/libs/components/teacher/course/model';
import { errorCode } from '@/libs/errors';
import type { AttendanceStatus } from '@/libs/gql/graphql';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { useErrorText } from '@/libs/i18n';
import { formatDate } from '@/libs/i18n/format';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';
import { viz } from '@/libs/viz';

export const getStaticProps = withTranslations(['teacher']);

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
const COLOR: Record<AttendanceStatus, string> = { PRESENT: viz.present, ABSENT: viz.absent, LATE: viz.late, EXCUSED: viz.excused };
type Filter = 'ALL' | 'EXCEPTIONS' | 'ABSENT' | 'LATE' | 'EXCUSED';

/** "2026-10-23" ± n days */
function shift(day: string, n: number): string {
  const d = dayDate(day);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Stitch "Teacher Attendance: Algebra 9A (Take Attendance View)". No timetable (DECISIONS §1): the
 * teacher picks the course and the day. Everyone starts PRESENT; only exceptions are marked and
 * the day is saved in one request (the server writes every student in one transaction).
 */
const AttendancePage: NextPageWithLayout = () => {
  const { t } = useTranslation('teacher');
  const router = useRouter();
  const { data: coursesData } = useQuery(TEACHING_COURSES, { fetchPolicy: 'cache-and-network' });
  const courses = (coursesData?.teachingCourses ?? []).filter((c) => c.status === 'ACTIVE');
  const course = courses.find((c) => c.id === router.query.course) ?? courses[0];
  const today = todayLocal();
  const requested = typeof router.query.date === 'string' ? router.query.date : today;
  // No future days: the server refuses them too
  const date = requested > today ? today : requested;
  useCrumb(course?.title ?? null);

  const setQuery = (patch: Record<string, string | undefined>) => {
    const query = { ...router.query, ...patch };
    for (const k of Object.keys(query)) if (query[k] === undefined) delete query[k];
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false });
  };

  if (coursesData && !course) return <Alert severity="info">{t('attendance.noCourses')}</Alert>;
  if (!course) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  // A new course or day starts a fresh form (the key resets the unsaved marks)
  return <AttendanceDay key={`${course.id}-${date}`} course={course} courses={courses} date={date} today={today} onQuery={setQuery} />;
};

function AttendanceDay({
  course,
  courses,
  date,
  today,
  onQuery,
}: {
  course: { id: string; title: string; studentCount: number };
  courses: { id: string; title: string }[];
  date: string;
  today: string;
  onQuery: (patch: Record<string, string | undefined>) => void;
}) {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const { locale } = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Record<string, { status: AttendanceStatus; note: string }>>({});
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const { data, error } = useQuery(TEACHER_ATTENDANCE, { variables: { courseId: course.id, date }, fetchPolicy: 'network-only' });
  const [mark, { loading: saving }] = useMutation(MARK_ATTENDANCE, { refetchQueries: ['TeacherAttendance', 'TeacherDashboard'] });

  const day = data?.courseAttendance;
  // Sorted by student ID, like Stitch (the server sends name order)
  const rows = useMemo(() => [...(day?.rows ?? [])].sort((a, b) => a.loginId.localeCompare(b.loginId)), [day]);
  const current = (id: string) => {
    const saved = rows.find((r) => r.studentId === id)!;
    return draft[id] ?? { status: saved.status, note: saved.note ?? '' };
  };
  const changed = rows.filter((r) => {
    const d = draft[r.studentId];
    return d && (d.status !== r.status || d.note !== (r.note ?? ''));
  });
  const dirty = changed.length > 0;

  // Leaving with unsaved marks asks first (closing the tab or reloading)
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (error) return <Alert severity="error">{errorText(errorCode(error))}</Alert>;
  if (!day) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const set = (id: string, patch: Partial<{ status: AttendanceStatus; note: string }>) => setDraft((all) => ({ ...all, [id]: { ...current(id), ...patch } }));
  const statusOf = (id: string) => current(id).status;
  const count = (s: AttendanceStatus) => rows.filter((r) => statusOf(r.studentId) === s).length;
  const matches = (id: string, f: Filter) => {
    const s = statusOf(id);
    return f === 'ALL' || (f === 'EXCEPTIONS' ? s !== 'PRESENT' : s === f);
  };
  const query = search.trim().toLowerCase();
  const shown = rows.filter((r) => matches(r.studentId, filter) && (!query || `${r.firstName} ${r.lastName} ${r.loginId}`.toLowerCase().includes(query)));
  const changedBy = (s: AttendanceStatus) => changed.filter((r) => statusOf(r.studentId) === s).length;

  const markAllPresent = () => setDraft(Object.fromEntries(rows.map((r) => [r.studentId, { status: 'PRESENT' as AttendanceStatus, note: current(r.studentId).note }])));

  const save = async () => {
    try {
      // Only exceptions (and present students with a note) are sent; the server marks the rest PRESENT
      const records = rows
        .map((r) => ({ studentId: r.studentId, ...current(r.studentId) }))
        .filter((r) => r.status !== 'PRESENT' || r.note.trim())
        .map((r) => ({ studentId: r.studentId, status: r.status, note: r.note.trim() || undefined }));
      await mark({ variables: { input: { courseId: course.id, date, records } } });
      setDraft({});
      setToast({ tone: 'success', text: t('attendance.saved') });
    } catch (err) {
      setToast({ tone: 'error', text: errorText(errorCode(err)) });
    }
  };

  const dateLabel = `${t(`dashboard.weekdayShort.${dayDate(date).getDay()}`)}, ${formatDate(dayDate(date), locale)}`;

  return (
    <Stack spacing={2.5} sx={{ pb: dirty || !day.isMarked ? 10 : 0 }}>
      {/* Header */}
      <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, justifyContent: 'space-between', alignItems: { md: 'flex-start' } }}>
          <Stack spacing={1.25}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              {t('attendance.title', { course: course.title })}
            </Typography>
            <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Stack direction="row" sx={{ alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                <IconButton size="small" onClick={() => onQuery({ date: shift(date, -1) })} aria-label={t('attendance.prevDay')}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography sx={{ px: 1, fontSize: '0.875rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 130, textAlign: 'center' }}>{dateLabel}</Typography>
                <IconButton size="small" onClick={() => onQuery({ date: shift(date, 1) })} disabled={date >= today} aria-label={t('attendance.nextDay')}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => picker.current?.showPicker?.()} aria-label={t('attendance.pickDate')} sx={{ borderLeft: 1, borderColor: 'divider', borderRadius: 0 }}>
                  <CalendarTodayOutlinedIcon fontSize="small" />
                </IconButton>
                <input
                  ref={picker}
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => e.target.value && onQuery({ date: e.target.value })}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                  tabIndex={-1}
                  aria-hidden
                />
              </Stack>
              <Select size="small" value={course.id} onChange={(e) => onQuery({ course: e.target.value })} inputProps={{ 'aria-label': t('gradebook.course') }} sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {courses.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.title}
                  </MenuItem>
                ))}
              </Select>
              {day.isMarked ? <Pill tone="success" icon={<CheckIcon />}>{t('attendance.taken')}</Pill> : <Pill tone="warning">{t('attendance.notTaken')}</Pill>}
            </Stack>
          </Stack>
          <Button variant="outlined" color="inherit" startIcon={<DoneAllIcon />} onClick={markAllPresent} sx={{ borderColor: 'divider', flexShrink: 0 }}>
            {t('attendance.allPresent')}
          </Button>
        </Stack>

        <Stack direction="row" sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {STATUSES.map((s) => (
              <Stack key={s} direction="row" sx={{ alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 999, border: 1, borderColor: 'divider', fontSize: '0.8125rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLOR[s] }} />
                {t(`attendance.status.${s}`)} {count(s)}
              </Stack>
            ))}
          </Stack>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{t('dashboard.students', { count: rows.length })}</Typography>
        </Stack>
        <Stack direction="row" sx={{ mt: 1.25, gap: 0.75, alignItems: 'center', color: 'text.secondary' }}>
          <InfoOutlinedIcon sx={{ fontSize: 16 }} />
          <Typography sx={{ fontSize: '0.75rem' }}>{t('attendance.defaultInfo')}</Typography>
        </Stack>
      </Card>

      {/* Filters */}
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 1.5, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          onChange={(_e, v: Filter | null) => v && setFilter(v)}
          sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.75rem', px: 1.5, py: 0.5 } }}
        >
          {(['ALL', 'EXCEPTIONS', 'ABSENT', 'LATE', 'EXCUSED'] as Filter[]).map((f) => (
            <ToggleButton key={f} value={f}>
              {t(`attendance.filter.${f}`, { count: rows.filter((r) => matches(r.studentId, f)).length })}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <TextField
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('attendance.search')}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          sx={{ width: { xs: '100%', md: 260 } }}
        />
      </Stack>

      {/* Table */}
      <Card variant="outlined" sx={{ borderRadius: '12px' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default', '& th': { fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' } }}>
                <TableCell align="center" sx={{ width: 40 }}>
                  #
                </TableCell>
                <TableCell sx={{ width: 110 }}>{t('grading.col.id')}</TableCell>
                <TableCell>{t('grading.col.name')}</TableCell>
                <TableCell sx={{ width: 200 }}>{t('grading.col.status')}</TableCell>
                <TableCell>{t('attendance.note')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {rows.length ? t('grading.empty') : t('attendance.noStudents')}
                  </TableCell>
                </TableRow>
              )}
              {shown.map((r) => {
                const value = current(r.studentId);
                const exception = value.status !== 'PRESENT';
                return (
                  <TableRow key={r.studentId} sx={{ bgcolor: exception ? `${COLOR[value.status]}0D` : undefined }}>
                    <TableCell align="center" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>
                      {rows.indexOf(r) + 1}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem' }}>{r.loginId}</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', borderLeft: exception ? `3px solid ${COLOR[value.status]}` : undefined }}>
                      {r.firstName} {r.lastName}
                    </TableCell>
                    <TableCell>
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={value.status}
                        onChange={(_e, s: AttendanceStatus | null) => s && set(r.studentId, { status: s })}
                        aria-label={t('attendance.statusOf', { name: `${r.firstName} ${r.lastName}` })}
                      >
                        {STATUSES.map((s) => (
                          <Tooltip key={s} title={t(`attendance.status.${s}`)}>
                            <ToggleButton
                              value={s}
                              aria-label={t(`attendance.status.${s}`)}
                              sx={{ width: 36, py: 0.25, fontWeight: 700, fontSize: '0.75rem', '&.Mui-selected, &.Mui-selected:hover': { bgcolor: COLOR[s], color: '#FFFFFF' } }}
                            >
                              {t(`attendance.letter.${s}`)}
                            </ToggleButton>
                          </Tooltip>
                        ))}
                      </ToggleButtonGroup>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={value.note}
                        onChange={(e) => set(r.studentId, { note: e.target.value })}
                        placeholder={t('attendance.notePlaceholder')}
                        slotProps={{ htmlInput: { maxLength: 300, 'aria-label': t('attendance.noteFor', { name: `${r.firstName} ${r.lastName}` }) } }}
                        sx={{ '& input': { fontSize: '0.8125rem', py: 0.6 } }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: 'divider', justifyContent: 'space-between', gap: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
          <span>{t('attendance.footer', { count: rows.length })}</span>
          <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap' }}>
            {STATUSES.map((s) => (
              <Stack key={s} direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLOR[s] }} />
                {t('attendance.legend', { letter: t(`attendance.letter.${s}`), status: t(`attendance.status.${s}`), count: count(s) })}
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Card>

      {/* Sticky save bar: unsaved marks, or a day not saved yet */}
      {(dirty || !day.isMarked) && (
        <Card
          variant="outlined"
          sx={{ position: 'sticky', bottom: 16, zIndex: 5, borderRadius: '12px', px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', boxShadow: 3 }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dirty ? 'warning.main' : 'text.disabled' }} />
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{dirty ? t('attendance.unsaved', { count: changed.length }) : t('attendance.notSavedYet')}</Typography>
            {dirty && (
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                ({STATUSES.filter((s) => changedBy(s)).map((s) => `${changedBy(s)} ${t(`attendance.status.${s}`)}`).join(', ')})
              </Typography>
            )}
          </Stack>
          <Stack direction="row" sx={{ gap: 1 }}>
            {dirty && (
              <Button color="inherit" onClick={() => setDraft({})} disabled={saving}>
                {t('attendance.discard')}
              </Button>
            )}
            <Button variant="contained" disableElevation startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />} onClick={save} disabled={saving || !rows.length}>
              {t('attendance.save')}
            </Button>
          </Stack>
        </Card>
      )}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.tone ?? 'success'} variant="filled" onClose={() => setToast(null)}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

AttendancePage.getLayout = layoutFor('TEACHER');
export default AttendancePage;
