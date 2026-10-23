import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Popover,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  Typography,
} from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import { useTranslation } from 'next-i18next/pages';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { PUBLISH_PERIOD_GRADES } from '@/apollo/teacher/mutation';
import { COURSE_ANNUAL_GRADES, COURSE_ASSIGNMENTS, COURSE_GRADES, COURSE_PERIOD_GRADES, COURSE_PERIODS, GRADEBOOK_COURSES } from '@/apollo/teacher/query';
import { downloadCsv, fileSlug } from '@/libs/csv';
import { layoutFor } from '@/libs/components/layout';
import { formatLocal } from '@/libs/components/teacher/grading/model';
import { MarkChip } from '@/libs/components/teacher/gradebook/MarkChip';
import { average, inPeriod, leafPeriods, markOf, pct, type StudentRow, type Thresholds } from '@/libs/components/teacher/gradebook/model';
import { WeightsDialog } from '@/libs/components/teacher/gradebook/WeightsDialog';
import { todayLocal } from '@/libs/components/teacher/course/model';
import { errorCode } from '@/libs/errors';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { useErrorText } from '@/libs/i18n';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['teacher']);

const DEFAULT_THRESHOLDS: Thresholds = { mark5MinPercent: 86, mark4MinPercent: 71, mark3MinPercent: 56 };
type SortKey = 'id' | 'name' | 'total' | 'missing' | `cat:${string}`;

/**
 * Stitch "Teacher Gradebook: Algebra · 9A (Quarter 1)" + the weights modal. One period at a time:
 * each student's % per category (published grades only, DECISIONS §10), the quarter %, the mark.
 * "Final" shows the quarters and the annual grade. Publishing a quarter stores a snapshot.
 */
const GradebookPage: NextPageWithLayout = () => {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const router = useRouter();
  const { locale } = router;
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'id', desc: false });
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [cell, setCell] = useState<{ el: HTMLElement; row: StudentRow; category: string } | null>(null);

  const { data: coursesData } = useQuery(GRADEBOOK_COURSES, { fetchPolicy: 'cache-and-network' });
  const { data: settings } = useQuery(SCHOOL_SETTINGS);
  const zone = settings?.schoolSettings.timezone ?? 'Asia/Tashkent';
  const thresholds: Thresholds = settings?.schoolSettings ?? DEFAULT_THRESHOLDS;

  const courses = useMemo(() => (coursesData?.teachingCourses ?? []).filter((c) => c.status !== 'ARCHIVED'), [coursesData]);
  const course = courses.find((c) => c.id === router.query.course) ?? courses.find((c) => c.status === 'ACTIVE') ?? courses[0];
  const { data: periodData } = useQuery(COURSE_PERIODS, { variables: { academicYearId: course?.academicYearId ?? '' }, skip: !course });
  const periods = useMemo(() => leafPeriods(periodData?.periods ?? []), [periodData]);
  const today = todayLocal();
  const requested = typeof router.query.period === 'string' ? router.query.period : undefined;
  const isFinal = requested === 'final';
  const period = isFinal ? undefined : (periods.find((p) => p.id === requested) ?? periods.find((p) => p.startsAt <= today && p.endsAt >= today) ?? periods[0]);

  const vars = { courseId: course?.id ?? '', periodId: period?.id ?? '' };
  const { data: gradesData, error } = useQuery(COURSE_GRADES, { variables: vars, skip: !course || !period, fetchPolicy: 'cache-and-network' });
  const { data: snapData } = useQuery(COURSE_PERIOD_GRADES, { variables: vars, skip: !course || !period, fetchPolicy: 'cache-and-network' });
  const { data: annualData } = useQuery(COURSE_ANNUAL_GRADES, { variables: { courseId: course?.id ?? '' }, skip: !course || !isFinal, fetchPolicy: 'cache-and-network' });
  const { data: assignmentData } = useQuery(COURSE_ASSIGNMENTS, { variables: { courseId: course?.id ?? '' }, skip: !course });
  const [publish, publishState] = useMutation(PUBLISH_PERIOD_GRADES, { refetchQueries: ['GradebookPeriodGrades'], awaitRefetchQueries: true });
  useCrumb(course?.title ?? null);

  const setQuery = (patch: Record<string, string | undefined>) => {
    const query = { ...router.query, ...patch };
    for (const k of Object.keys(query)) if (query[k] === undefined) delete query[k];
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false });
  };

  const categories = useMemo(() => [...(course?.gradeCategories ?? [])].sort((a, b) => a.order - b.order), [course]);
  const rows = useMemo(() => gradesData?.courseGrades ?? [], [gradesData]);

  // This period's assignments (same rule as the server: due date in the period, school time)
  const periodAssignments = useMemo(
    () => (period ? (assignmentData?.courseAssignments ?? []).filter((a) => a.publishedAt && inPeriod(a.dueAt, period, zone)) : []),
    [assignmentData, period, zone],
  );
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, { count: number; unpublished: number }>();
    for (const a of periodAssignments) {
      const v = map.get(a.categoryId) ?? { count: 0, unpublished: 0 };
      v.count++;
      if (!a.gradesPublishedAt) v.unpublished++;
      map.set(a.categoryId, v);
    }
    return map;
  }, [periodAssignments]);

  const missingOf = (r: StudentRow) => r.items.filter((i) => i.status === 'MISSING').length;
  const catPercent = (r: StudentRow, id: string) => r.categories.find((c) => c.categoryId === id)?.percent ?? null;

  const sorted = useMemo(() => {
    const value = (r: StudentRow): string | number => {
      if (sort.key === 'id') return r.loginId;
      if (sort.key === 'name') return `${r.lastName} ${r.firstName}`;
      if (sort.key === 'total') return r.percent ?? -1;
      if (sort.key === 'missing') return r.items.filter((i) => i.status === 'MISSING').length;
      return r.categories.find((c) => c.categoryId === sort.key.slice(4))?.percent ?? -1;
    };
    return [...rows].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.desc ? -order : order;
    });
  }, [rows, sort]);

  if (coursesData && !course) {
    return <Alert severity="info">{t('gradebook.noCourses')}</Alert>;
  }
  if (error) return <Alert severity="error">{errorText(errorCode(error))}</Alert>;
  if (!course || !periodData) {
    return (
      <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const classAverage = average(rows.map((r) => r.percent));
  const totalMissing = rows.reduce((n, r) => n + missingOf(r), 0);
  const gradedItems = periodAssignments.filter((a) => a.gradesPublishedAt).length;
  const snapshots = snapData?.coursePeriodGrades ?? [];
  const publishedAt = snapshots.find((s) => s.publishedAt)?.publishedAt ?? null;
  const outdated = snapshots.filter((s) => s.isOutdated).length;
  const canEdit = course.status !== 'ARCHIVED';

  const head = (key: SortKey, label: string, align: 'left' | 'right' = 'right') => (
    <TableCell align={align} sortDirection={sort.key === key ? (sort.desc ? 'desc' : 'asc') : false}>
      <TableSortLabel active={sort.key === key} direction={sort.key === key && sort.desc ? 'desc' : 'asc'} onClick={() => setSort({ key, desc: sort.key === key ? !sort.desc : false })}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  const exportCsv = () => {
    if (isFinal) {
      const annual = annualData?.courseAnnualGrades ?? [];
      downloadCsv(
        `${fileSlug(course.title, t('gradebook.final'))}.csv`,
        [t('gradebook.col.id'), t('gradebook.col.name'), ...periods.map((p) => p.name), t('gradebook.annual'), t('gradebook.col.mark')],
        annual.map((r) => [r.annual.loginId, `${r.annual.lastName} ${r.annual.firstName}`, ...r.periods.map((p) => p.score), r.annual.score, r.annual.mark]),
      );
      return;
    }
    downloadCsv(
      `${fileSlug(course.title, period?.name ?? '')}.csv`,
      [t('gradebook.col.id'), t('gradebook.col.name'), ...categories.map((c) => `${c.name} (${c.weight}%)`), t('gradebook.col.total'), t('gradebook.col.mark'), t('gradebook.col.missing')],
      sorted.map((r) => [r.loginId, `${r.lastName} ${r.firstName}`, ...categories.map((c) => catPercent(r, c.id)), r.percent, r.mark, missingOf(r)]),
    );
  };

  const runPublish = async () => {
    try {
      await publish({ variables: { input: { courseId: course.id, periodId: period!.id } } });
      setToast({ tone: 'success', text: t('gradebook.publishDone', { period: period!.name }) });
    } catch (err) {
      setToast({ tone: 'error', text: errorText(errorCode(err)) });
    } finally {
      setConfirmPublish(false);
    }
  };

  const stat = (label: string, value: ReactNode, tone?: 'warn') => (
    <Box>
      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.1, color: tone ? 'warning.dark' : 'text.primary', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: 1 }}>
        {value}
      </Typography>
    </Box>
  );

  const cellItems = cell ? cell.row.items.filter((i) => i.categoryName === cell.category) : [];

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
            {t('gradebook.title')}
          </Typography>
          <Select size="small" value={course.id} onChange={(e) => setQuery({ course: e.target.value, period: undefined })} sx={{ fontWeight: 600, bgcolor: 'background.paper' }} inputProps={{ 'aria-label': t('gradebook.course') }}>
            {courses.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.title}
              </MenuItem>
            ))}
          </Select>
        </Stack>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {canEdit && (
            <Button variant="outlined" color="inherit" startIcon={<TuneOutlinedIcon />} onClick={() => setWeightsOpen(true)} sx={{ borderColor: 'divider', bgcolor: 'background.paper' }}>
              {t('gradebook.weightsButton')}
            </Button>
          )}
          <Button variant="outlined" color="inherit" startIcon={<DownloadOutlinedIcon />} onClick={exportCsv} sx={{ borderColor: 'divider', bgcolor: 'background.paper' }}>
            {t('gradebook.export')}
          </Button>
          {!isFinal && canEdit && (
            <Button variant="contained" disableElevation startIcon={<PublishOutlinedIcon />} onClick={() => setConfirmPublish(true)} disabled={!rows.length}>
              {publishedAt ? t('gradebook.republish') : t('gradebook.publish')}
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Quarter tabs + Final */}
      <Tabs
        value={isFinal ? 'final' : (period?.id ?? false)}
        onChange={(_e, value: string) => setQuery({ period: value })}
        variant="scrollable"
        sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600 } }}
      >
        {periods.map((p) => (
          <Tab key={p.id} value={p.id} label={p.name} />
        ))}
        <Tab value="final" label={t('gradebook.final')} />
      </Tabs>

      {isFinal ? (
        <FinalTable rows={annualData?.courseAnnualGrades} periods={periods.map((p) => p.name)} thresholds={thresholds} />
      ) : (
        <>
          {publishedAt && (
            <Alert severity={outdated ? 'warning' : 'success'} variant="outlined">
              {t('gradebook.publishedOn', { period: period?.name, date: formatLocal(publishedAt, locale) })}
              {outdated > 0 && ` ${t('gradebook.outdated', { count: outdated })}`}
            </Alert>
          )}

          {/* Summary strip */}
          <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5 }}>
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}>
              {stat(
                t('gradebook.classAverage'),
                <>
                  {pct(classAverage)}
                  <MarkChip mark={markOf(classAverage, thresholds)} />
                </>,
              )}
              {stat(t('gradebook.students'), rows.length)}
              {stat(t('gradebook.publishedItems'), t('gradebook.xOfY', { x: gradedItems, y: periodAssignments.length }))}
              {stat(t('gradebook.missing'), totalMissing, totalMissing ? 'warn' : undefined)}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {categories.map((c) => (
                <Box key={c.id} component="span" sx={{ px: 1.25, py: 0.5, borderRadius: 999, bgcolor: 'background.default', border: 1, borderColor: 'divider', fontSize: '0.75rem', fontWeight: 500 }}>
                  {c.name} {c.weight}%
                </Box>
              ))}
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic', ml: 1 }}>{t('gradebook.rule')}</Typography>
            </Stack>
          </Card>

          {/* Table */}
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <Stack direction="row" sx={{ px: 2.5, py: 1.5, borderBottom: 1, borderColor: 'divider', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 600 }}>{t('gradebook.enrolled', { count: rows.length })}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t(`gradebook.sortedBy.${sort.key.startsWith('cat:') ? 'category' : sort.key}`)}</Typography>
            </Stack>
            <TableContainer>
              <Table size="small" sx={{ '& td': { fontSize: '0.8125rem' } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#EFF5F0', '& th': { fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' } }}>
                    <TableCell align="center" sx={{ width: 40 }}>
                      #
                    </TableCell>
                    {head('id', t('gradebook.col.id'), 'left')}
                    {head('name', t('gradebook.col.name'), 'left')}
                    {categories.map((c) => head(`cat:${c.id}`, `${c.name} (${c.weight}%)`))}
                    {head('total', t('gradebook.col.total'))}
                    <TableCell align="center">{t('gradebook.col.mark')}</TableCell>
                    {head('missing', t('gradebook.col.missing'))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={categories.length + 6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        {gradesData ? t('gradebook.empty') : <CircularProgress size={20} />}
                      </TableCell>
                    </TableRow>
                  )}
                  {sorted.map((r, i) => {
                    const missing = missingOf(r);
                    return (
                      <TableRow key={r.studentId} hover>
                        <TableCell align="center" sx={{ color: 'text.disabled', fontSize: '0.75rem !important' }}>
                          {i + 1}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem !important' }}>{r.loginId}</TableCell>
                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {r.lastName} {r.firstName}
                        </TableCell>
                        {categories.map((c) => {
                          const value = catPercent(r, c.id);
                          return (
                            <TableCell key={c.id} align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {value == null ? (
                                <Box component="span" sx={{ color: 'text.disabled' }} title={t('gradebook.noGrades')}>
                                  —
                                </Box>
                              ) : (
                                <Box
                                  component="button"
                                  onClick={(e) => setCell({ el: e.currentTarget, row: r, category: c.name })}
                                  sx={{ all: 'unset', cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, '&:focus-visible': { outline: 2, outlineColor: 'secondary.main' } }}
                                >
                                  {pct(value)}
                                </Box>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {pct(r.percent)}
                        </TableCell>
                        <TableCell align="center">
                          <MarkChip mark={r.mark} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: missing >= 2 ? 'error.main' : missing ? 'warning.dark' : 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
                          {missing}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                {sorted.length > 0 && (
                  <TableFooter>
                    <TableRow sx={{ bgcolor: 'background.default', '& td': { fontWeight: 700, color: 'text.primary', fontSize: '0.8125rem', borderTop: 2, borderColor: 'divider' } }}>
                      <TableCell colSpan={3}>{t('gradebook.classAverage')}</TableCell>
                      {categories.map((c) => (
                        <TableCell key={c.id} align="right">
                          {pct(average(rows.map((r) => catPercent(r, c.id))))}
                        </TableCell>
                      ))}
                      <TableCell align="right">{pct(classAverage)}</TableCell>
                      <TableCell align="center">
                        <MarkChip mark={markOf(classAverage, thresholds)} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem !important' }}>
                        {t('gradebook.totalMissing', { count: totalMissing })}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
        {t('gradebook.legend', { m5: thresholds.mark5MinPercent, m4: thresholds.mark4MinPercent, m3: thresholds.mark3MinPercent })}
      </Typography>

      {/* A category cell: the published items behind its % */}
      <Popover open={!!cell} anchorEl={cell?.el} onClose={() => setCell(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Box sx={{ p: 2, minWidth: 260, maxWidth: 360 }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 1 }}>
            {cell?.row.firstName} {cell?.row.lastName} · {cell?.category}
          </Typography>
          <Stack spacing={0.75}>
            {cellItems.map((i) => (
              <Stack key={i.assignmentId} direction="row" sx={{ justifyContent: 'space-between', gap: 2, fontSize: '0.8125rem' }}>
                <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {i.title}
                </Box>
                <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: i.status === 'MISSING' ? 'error.main' : 'text.primary', flexShrink: 0 }}>
                  {i.score} / {i.maxScore}
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Popover>

      {weightsOpen && <WeightsDialog course={course} items={itemsByCategory} thresholds={thresholds} onClose={() => setWeightsOpen(false)} />}

      <Dialog open={confirmPublish} onClose={() => setConfirmPublish(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('gradebook.confirmTitle', { period: period?.name })}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{t('gradebook.confirmBody', { count: rows.length })}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" color="inherit" onClick={() => setConfirmPublish(false)} sx={{ borderColor: 'divider' }}>
            {t('course.cancel')}
          </Button>
          <Button variant="contained" disableElevation onClick={runPublish} disabled={publishState.loading} startIcon={publishState.loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {t('gradebook.publish')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.tone ?? 'success'} variant="filled" onClose={() => setToast(null)}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </Stack>
  );
};

/** "Final": each quarter's grade (published snapshot or live) and the annual grade */
function FinalTable({
  rows,
  periods,
  thresholds,
}: {
  rows: { periods: { periodId?: string | null; score?: number | null; isPublished: boolean }[]; annual: { studentId: string; loginId: string; firstName: string; lastName: string; score?: number | null; mark?: number | null } }[] | undefined;
  periods: string[];
  thresholds: Thresholds;
}) {
  const { t } = useTranslation('teacher');
  if (!rows) {
    return (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  const avg = average(rows.map((r) => r.annual.score));
  return (
    <Card variant="outlined" sx={{ borderRadius: '12px' }}>
      <Stack direction="row" sx={{ px: 2.5, py: 1.5, borderBottom: 1, borderColor: 'divider', justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 600 }}>{t('gradebook.enrolled', { count: rows.length })}</Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('gradebook.finalRule')}</Typography>
      </Stack>
      <TableContainer>
        <Table size="small" sx={{ '& td': { fontSize: '0.8125rem' } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#EFF5F0', '& th': { fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' } }}>
              <TableCell align="center">#</TableCell>
              <TableCell>{t('gradebook.col.id')}</TableCell>
              <TableCell>{t('gradebook.col.name')}</TableCell>
              {periods.map((p) => (
                <TableCell key={p} align="right">
                  {p}
                </TableCell>
              ))}
              <TableCell align="right">{t('gradebook.annual')}</TableCell>
              <TableCell align="center">{t('gradebook.col.mark')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.annual.studentId} hover>
                <TableCell align="center" sx={{ color: 'text.disabled' }}>
                  {i + 1}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{r.annual.loginId}</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {r.annual.lastName} {r.annual.firstName}
                </TableCell>
                {r.periods.map((p, j) => (
                  <TableCell key={p.periodId ?? j} align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: p.isPublished ? 'text.primary' : 'text.disabled' }} title={p.isPublished ? undefined : t('gradebook.livePeriod')}>
                    {pct(p.score)}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {pct(r.annual.score)}
                </TableCell>
                <TableCell align="center">
                  <MarkChip mark={r.annual.mark} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow sx={{ bgcolor: 'background.default', '& td': { fontWeight: 700, color: 'text.primary', fontSize: '0.8125rem' } }}>
              <TableCell colSpan={3 + periods.length}>{t('gradebook.classAverage')}</TableCell>
              <TableCell align="right">{pct(avg)}</TableCell>
              <TableCell align="center">
                <MarkChip mark={markOf(avg, thresholds)} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Card>
  );
}

GradebookPage.getLayout = layoutFor('TEACHER');
export default GradebookPage;
