import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Box, Card, Link, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import PercentRoundedIcon from '@mui/icons-material/PercentRounded';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import { useTranslation } from 'next-i18next/pages';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { fadeUp, useCountUp } from '@/libs/components/dashboard/motion';
import { STITCH, SoftPill } from '@/libs/components/student/home/parts';
import type { ParentHomeQuery } from '@/libs/gql/graphql';
import { viz } from '@/libs/viz';

type Home = ParentHomeQuery;
type Course = Home['myGrades']['courses'][number];

/** The parent pages keep the chosen child in the URL (?child=…) */
export const parentHref = (path: string, child: string) => ({ pathname: path, query: { child } });

const pct = (n: number | null | undefined) => (n == null ? '—' : `${Number.isInteger(n) ? n : n.toFixed(1)}%`);

/** Same rule as the server's "missing" count: past due and not handed in (an exam is graded offline) */
const isMissing = (item: Course['items'][number]) => item.state === 'MISSING' || (item.state === 'NOT_SUBMITTED' && item.type !== 'EXAM');

/** "Oct 5" in the viewer's language */
const shortDate = (iso: string, locale = 'en') => new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' });

/** "Oct 28" or "Oct 28 – Nov 1" from "YYYY-MM-DD" (a calendar date: no timezone shift) */
const eventLabel = (day: string, locale = 'en') => new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Markdown marks out, for the two-line preview */
const plain = (md: string) => md.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_#>`-]/g, '').replace(/\s+/g, ' ').trim();

/**
 * Stitch "Parent Dashboard (Compact eCampus View)" (DECISIONS §10): the chosen child's quarter at a
 * glance — attendance, missing work, average score, quarter grades, latest published grades with the
 * teacher's comment, and the latest announcements with the school office phone.
 */
export function ParentHome({ data, child }: { data: Home; child: string }) {
  const { t } = useTranslation('parent');
  const { locale } = useRouter();
  const { studentOverview: overview, myGrades: grades } = data;
  const { student } = overview;

  const graded = grades.courses.filter((c) => c.percent != null);
  const average = graded.length ? Math.round((graded.reduce((n, c) => n + c.percent!, 0) / graded.length) * 10) / 10 : null;
  const missing = grades.courses.flatMap((c) => c.items.filter(isMissing).map((item) => ({ item, course: c })));
  const first = missing[0];
  const { attendance } = grades;

  return (
    <Stack spacing={4} sx={{ maxWidth: 1040, width: '100%', mx: 'auto' }}>
      {/* Header: quarter, child, class and ID */}
      <Box sx={fadeUp(0)}>
        {overview.period && (
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {t('home.periodWeek', { period: overview.period.name, week: overview.period.week })}
          </Typography>
        )}
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mt: 0.75, flexWrap: 'wrap' }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            {student.firstName} {student.lastName}
          </Typography>
          <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: '#EFEEEA', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {student.className ? t('home.classId', { className: student.className, id: student.loginId }) : t('home.id', { id: student.loginId })}
          </Box>
        </Stack>
      </Box>

      {/* KPI tiles */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' } }}>
        <Kpi
          index={1}
          icon={CheckCircleOutlineRoundedIcon}
          tile="aqua"
          label={t('home.kpi.attendance')}
          value={attendance.rate}
          decimals={attendance.rate != null && !Number.isInteger(attendance.rate) ? 1 : 0}
          unit="%"
          footer={attendance.total ? t('home.kpi.attendanceNote', { total: attendance.total, absent: attendance.absent, excused: attendance.excused }) : t('home.kpi.noMarks')}
        />
        <Kpi
          index={2}
          icon={AssignmentLateOutlinedIcon}
          tile={grades.missing ? 'amber' : 'spruce'}
          label={t('home.kpi.missing')}
          value={grades.missing}
          tone={grades.missing ? 'warning' : undefined}
          footer={
            first
              ? `${first.item.title} · ${first.course.subjectName}${first.course.teacherName ? ` (${first.course.teacherName})` : ''}${missing.length > 1 ? ` ${t('home.kpi.more', { count: missing.length - 1 })}` : ''}`
              : t('home.kpi.nothingMissing')
          }
        />
        <Kpi
          index={3}
          icon={PercentRoundedIcon}
          tile="spruce"
          label={t('home.kpi.average')}
          value={average}
          decimals={average != null && !Number.isInteger(average) ? 1 : 0}
          unit="%"
          footer={graded.length ? t('home.kpi.acrossCourses', { count: graded.length }) : t('home.kpi.noGrades')}
        />
      </Box>

      {/* Quarter grades */}
      <Box sx={fadeUp(4)}>
        <SectionHead
          eyebrow={t('home.grades.eyebrow')}
          title={t('home.grades.title')}
          action={
            <Link component={NextLink} href={parentHref('/parent/grades', child)} underline="hover" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              {t('home.grades.all')}
            </Link>
          }
        />
        <Card variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          {grades.courses.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
              {grades.period ? t('home.grades.empty') : t('home.grades.noPeriod')}
            </Typography>
          ) : (
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { px: { xs: 2, md: 2.5 }, py: 1.5, textAlign: 'left' }, '& tbody tr + tr td': { borderTop: 1, borderColor: '#ECEEE8' } }}>
              <Box component="thead" sx={{ bgcolor: '#F1F2EE', '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' } }}>
                <tr>
                  <th>{t('home.grades.course')}</th>
                  <Box component="th" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {t('home.grades.teacher')}
                  </Box>
                  <Box component="th" sx={{ textAlign: 'right !important' }}>
                    {t('home.grades.grade')}
                  </Box>
                </tr>
              </Box>
              <tbody>
                {grades.courses.map((c) => (
                  <tr key={c.courseId}>
                    <td>
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 500 }}>{c.subjectName}</Typography>
                        {c.missing > 0 && <SoftPill tone="peach">{t('home.grades.missing', { count: c.missing })}</SoftPill>}
                      </Stack>
                      <Typography sx={{ display: { xs: 'block', sm: 'none' }, fontSize: '0.75rem', color: 'text.secondary' }}>{c.teacherName ?? '—'}</Typography>
                    </td>
                    <Box component="td" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '0.8125rem', color: 'text.secondary' }}>
                      {c.teacherName ?? '—'}
                    </Box>
                    <Box component="td" sx={{ textAlign: 'right !important', whiteSpace: 'nowrap' }}>
                      <Typography component="span" sx={{ fontSize: '1.0625rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: c.mark != null && c.mark <= 3 ? 'warning.dark' : 'text.primary' }}>
                        {pct(c.percent)}
                      </Typography>
                      {c.mark != null && (
                        <Typography component="span" sx={{ ml: 0.75, fontSize: '0.8125rem', fontWeight: 600, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                          {t('home.grades.mark', { mark: c.mark })}
                        </Typography>
                      )}
                      {c.percent != null && !c.isFinal && <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled' }}>{t('home.grades.notFinal')}</Typography>}
                    </Box>
                  </tr>
                ))}
              </tbody>
            </Box>
          )}
        </Card>
      </Box>

      {/* Recent grades + announcements */}
      <Box sx={{ display: 'grid', gap: { xs: 4, md: 3 }, gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, alignItems: 'start' }}>
        <Box sx={fadeUp(5)}>
          <SectionHead eyebrow={t('home.recent.eyebrow')} title={t('home.recent.title')} />
          {overview.recentGrades.length === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: '12px', p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('home.recent.empty')}</Typography>
            </Card>
          ) : (
            <Stack spacing={1.5}>
              {overview.recentGrades.map((g) => (
                <Card key={g.assignmentId} variant="outlined" sx={{ borderRadius: '12px', p: 2, display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: STITCH.onSurfaceVariant, fontVariantNumeric: 'tabular-nums' }}>
                      {g.courseTitle} · {shortDate(g.publishedAt, locale)}
                    </Typography>
                    <Typography sx={{ mt: 0.25, fontSize: '0.9375rem', fontWeight: 600 }}>{g.title}</Typography>
                    {g.feedback && (
                      <Typography sx={{ mt: 0.5, fontSize: '0.8125rem', fontStyle: 'italic', color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        “{g.feedback}”
                      </Typography>
                    )}
                  </Box>
                  <Typography sx={{ flexShrink: 0, fontSize: '1.125rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {g.score} / {g.maxScore}
                  </Typography>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        <Box sx={fadeUp(6)}>
          <SectionHead
            eyebrow={t('home.news.eyebrow')}
            title={t('home.news.title')}
            action={
              <Link component={NextLink} href={parentHref('/parent/announcements', child)} underline="hover" aria-label={t('home.news.all')} sx={{ display: 'inline-flex', color: 'primary.main' }}>
                <CampaignOutlinedIcon fontSize="small" />
              </Link>
            }
          />
          <Card variant="outlined" sx={{ borderRadius: '12px', p: 2 }}>
            {overview.announcements.list.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                {t('home.news.empty')}
              </Typography>
            ) : (
              <Stack sx={{ '& > * + *': { borderTop: 1, borderColor: '#ECEEE8' } }}>
                {overview.announcements.list.map((a) => (
                  <Box key={a.id} sx={{ py: 1.5, '&:first-of-type': { pt: 0.5 } }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                      <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>{a.title}</Typography>
                      <Box component="span" sx={{ flexShrink: 0, px: 0.75, py: 0.125, borderRadius: 1, bgcolor: '#F1F2EE', fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {a.eventDate ? eventLabel(a.eventDate, locale) : (a.courseTitle ?? t('home.news.school'))}
                      </Box>
                    </Stack>
                    <Typography sx={{ mt: 0.25, fontSize: '0.8125rem', color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {plain(a.body)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
            <OfficeHotline />
          </Card>
        </Box>
      </Box>
    </Stack>
  );
}

/** Small uppercase eyebrow + section title, with an optional link on the right (Stitch) */
function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, mb: 1.5 }}>
      <Box>
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'secondary.main' }}>{eyebrow}</Typography>
        <Typography component="h2" sx={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
          {title}
        </Typography>
      </Box>
      {action}
    </Stack>
  );
}

/** The school office phone from Settings (hidden when the admin has not set one) */
function OfficeHotline() {
  const { t } = useTranslation('parent');
  const { data } = useQuery(SCHOOL_SETTINGS);
  const phone = data?.schoolSettings.contactPhone;
  if (!phone) return null;
  return (
    <Stack direction="row" sx={{ mt: 1.5, px: 1.5, py: 1.25, borderRadius: 2, bgcolor: '#F1F2EE', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, color: 'text.secondary' }}>
        <SupportAgentOutlinedIcon fontSize="small" />
        <Typography sx={{ fontSize: '0.8125rem' }}>
          {t('home.news.hotline')}
          {data?.schoolSettings.officeHours ? ` · ${data.schoolSettings.officeHours}` : ''}
        </Typography>
      </Stack>
      <Link href={`tel:${phone.replace(/[^\d+]/g, '')}`} underline="hover" sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
        {phone}
      </Link>
    </Stack>
  );
}

/** Stitch KPI: label and icon on top, the number, one line of context; the number counts up */
function Kpi({
  index,
  icon: Icon,
  tile,
  label,
  value,
  decimals = 0,
  unit = '',
  tone,
  footer,
}: {
  index: number;
  icon: SvgIconComponent;
  tile: keyof typeof viz.tile;
  label: string;
  value: number | null;
  decimals?: number;
  unit?: string;
  tone?: 'warning';
  footer: string;
}) {
  const { i18n } = useTranslation();
  const counted = useCountUp(value ?? 0);
  const text = value == null ? '—' : `${counted.toLocaleString(i18n.language, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${unit}`;
  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5, display: 'flex', flexDirection: 'column', gap: 1, ...fadeUp(index) }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: tone ? 'warning.dark' : 'text.secondary' }}>{label}</Typography>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: viz.tile[tile].bg, color: viz.tile[tile].fg, flexShrink: 0 }}>
          <Icon sx={{ fontSize: 20 }} />
        </Box>
      </Stack>
      <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, fontVariantNumeric: 'proportional-nums', color: value == null ? 'text.disabled' : 'text.primary' }}>{text}</Typography>
      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{footer}</Typography>
    </Card>
  );
}
