import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box, Button, ButtonBase, Card, Collapse, IconButton, InputAdornment, Link, Stack, TextField, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SmartDisplayRoundedIcon from '@mui/icons-material/SmartDisplayRounded';
import { useTranslation } from 'next-i18next/pages';
import { SET_SITE_OPEN_COURSE_PUBLISHED } from '@/apollo/admin/mutation';
import { ADMIN_SITE_OPEN_COURSES } from '@/apollo/admin/query';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { type AdminOpenCourse, COURSE_CATEGORIES, LessonThumb, OpenCourseDrawer } from '@/libs/components/admin/site/OpenCourseDrawer';
import { SiteSwitch, StatusPill } from '@/libs/components/admin/site/shared';
import { layoutFor } from '@/libs/components/layout';
import type { SiteCourseCategory } from '@/libs/gql/graphql';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';
import { clock, totalText, youtubeWatch } from '@/libs/youtube';

export const getStaticProps = withTranslations(['admin', 'teacher']);

const GRID = 'minmax(0, 1fr) 120px 110px 120px 70px 40px';
/** An open row lists this many lessons, then "+ N more" */
const PREVIEW_LESSONS = 4;
/** Stitch's category badges */
const CATEGORY_TONE: Record<SiteCourseCategory, { bg: string; fg: string }> = {
  IT: { bg: '#EEF0F4', fg: '#3F4A5C' },
  MATH: { bg: '#FEF3E2', fg: '#9A4A00' },
  AI: { bg: '#E8F0FB', fg: '#1D4E89' },
  STUDY_ABROAD: { bg: '#E8EFEA', fg: '#1F4E43' },
};

/**
 * Stitch "Campusly Admin — Website: Open Courses": category chips with counts, search, a table
 * (course with its first video's picture and source, category, lessons, status, on-site switch)
 * whose rows open to the source, description, the first lessons, "+ N more" and the total length.
 * The switch publishes a course or puts it back to draft ("Hide from site").
 */
const OpenCoursesPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const { data, refetch } = useQuery(ADMIN_SITE_OPEN_COURSES, { fetchPolicy: 'cache-and-network' });
  const [setPublished] = useMutation(SET_SITE_OPEN_COURSE_PUBLISHED);
  const [category, setCategory] = useState<SiteCourseCategory | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ course: AdminOpenCourse | null } | null>(null);

  const all = data?.adminSiteOpenCourses ?? [];
  const q = search.trim().toLowerCase();
  const shown = all
    .filter((c) => category === 'ALL' || c.category === category)
    .filter((c) => !q || [c.title.en, c.title.uz, c.title.ru, c.title.ko, c.source].some((s) => s?.toLowerCase().includes(q)));
  const publish = (c: AdminOpenCourse, published: boolean) => setPublished({ variables: { id: c.id, published } }).then(() => refetch());

  const row = (c: AdminOpenCourse) => {
    const expanded = open === c.id;
    const published = c.status === 'PUBLISHED';
    const first = c.lessons[0];
    const lessons = showAll === c.id ? c.lessons : c.lessons.slice(0, PREVIEW_LESSONS);
    return (
      <Box key={c.id} sx={{ borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr) 60px 40px', md: GRID }, gap: 2, px: 2.5, py: 1.5, alignItems: 'center' }}>
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', minWidth: 0 }}>
            {first ? (
              <LessonThumb id={first.youtubeId} sec={null} width={64} />
            ) : (
              <Box sx={{ width: 64, aspectRatio: '16 / 9', borderRadius: 1, bgcolor: 'action.hover', flexShrink: 0 }} />
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {c.title.en}
              </Typography>
              <Typography noWrap sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {[c.source, t('site.courses.lessonsCount', { count: c.lessons.length })].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 1, fontSize: '0.75rem', fontWeight: 600, bgcolor: CATEGORY_TONE[c.category].bg, color: CATEGORY_TONE[c.category].fg }}>
              {t(`site.courses.cat.${c.category}`)}
            </Box>
          </Box>
          <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.875rem', color: 'text.secondary' }}>{t('site.courses.lessonsCount', { count: c.lessons.length })}</Typography>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <StatusPill tone={published ? 'green' : 'grey'}>{t(`site.courses.status.${published ? 'PUBLISHED' : 'DRAFT'}`)}</StatusPill>
          </Box>
          <SiteSwitch checked={published} label={t('site.courses.onSiteSwitch', { name: c.title.en })} onToggle={(v) => publish(c, v)} />
          <IconButton size="small" onClick={() => setOpen(expanded ? null : c.id)} aria-expanded={expanded} aria-label={expanded ? t('site.collapse') : t('site.expand')}>
            {expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
          </IconButton>
        </Box>
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ mx: 2.5, mb: 2, p: 2.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, justifyContent: 'space-between', alignItems: { md: 'flex-start' } }}>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Stack direction="row" component="span" sx={{ gap: 0.5, alignItems: 'center', px: 0.75, py: 0.125, borderRadius: 1, bgcolor: '#FDECEC', color: '#B42318', fontSize: '0.6875rem', fontWeight: 700 }}>
                    <SmartDisplayRoundedIcon sx={{ fontSize: 14 }} />
                    YouTube
                  </Stack>
                  {c.source && <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('site.courses.sourceN', { source: c.source })}</Typography>}
                </Stack>
                {c.description && <Typography sx={{ mt: 0.75, fontSize: '0.875rem', color: 'text.secondary' }}>{c.description.en}</Typography>}
              </Box>
              <Stack direction="row" sx={{ gap: 1, flexShrink: 0 }}>
                {published && (
                  <Button size="small" variant="outlined" color="inherit" onClick={() => void publish(c, false)}>
                    {t('site.courses.hide')}
                  </Button>
                )}
                <Button size="small" variant="contained" disableElevation startIcon={<EditOutlinedIcon />} onClick={() => setDrawer({ course: c })}>
                  {t('site.courses.editCourse')}
                </Button>
              </Stack>
            </Stack>
            <Stack sx={{ gap: 1, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              {lessons.map((l, i) => (
                <Stack key={`${l.youtubeId}-${i}`} direction="row" sx={{ alignItems: 'center', gap: 1.5, p: 1, borderRadius: 1.5, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                  <LessonThumb id={l.youtubeId} sec={null} width={56} />
                  <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: '0.875rem' }}>
                    {i + 1}. {l.title}
                  </Typography>
                  {l.durationSec != null && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{clock(l.durationSec)}</Typography>}
                  <IconButton size="small" href={youtubeWatch(l.youtubeId)} target="_blank" rel="noopener noreferrer" aria-label={t('site.courses.watch', { title: l.title })} sx={{ color: '#D92D20' }}>
                    <PlayCircleOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              {c.lessons.length === 0 && <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{t('site.courses.noLessons')}</Typography>}
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                {c.lessons.length > PREVIEW_LESSONS && showAll !== c.id ? (
                  <Link component="button" underline="hover" onClick={() => setShowAll(c.id)} sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    {t('site.courses.moreLessons', { count: c.lessons.length - PREVIEW_LESSONS })} →
                  </Link>
                ) : (
                  <span />
                )}
                {c.totalDurationSec > 0 && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('site.courses.total', { time: totalText(c.totalDurationSec) })}</Typography>}
              </Stack>
            </Stack>
          </Box>
        </Collapse>
      </Box>
    );
  };

  return (
    <>
      <PageHeader
        title={t('site.courses.pageTitle')}
        subtitle={t('site.courses.pageSubtitle')}
        actions={
          <>
            <Button variant="outlined" color="inherit" endIcon={<NorthEastRoundedIcon />} href="/#open-courses" target="_blank">
              {t('site.previewOnSite')}
            </Button>
            <Button variant="contained" disableElevation startIcon={<AddRoundedIcon />} onClick={() => setDrawer({ course: null })}>
              {t('site.courses.new')}
            </Button>
          </>
        }
      />
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, mb: 2, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }} role="tablist" aria-label={t('site.courses.category')}>
          {(['ALL', ...COURSE_CATEGORIES] as const).map((k) => {
            const on = category === k;
            const count = k === 'ALL' ? all.length : all.filter((c) => c.category === k).length;
            return (
              <ButtonBase key={k} role="tab" aria-selected={on} onClick={() => setCategory(k)} sx={{ px: 1.75, py: 0.625, borderRadius: 999, border: 1, gap: 0.75, fontSize: '0.8125rem', fontWeight: 600, borderColor: on ? 'primary.main' : 'divider', bgcolor: on ? 'primary.main' : 'background.paper', color: on ? '#fff' : 'text.secondary' }}>
                {k === 'ALL' ? t('site.courses.all') : t(`site.courses.cat.${k}`)}
                <Box component="span" sx={{ opacity: 0.75 }}>
                  {count}
                </Box>
              </ButtonBase>
            );
          })}
        </Stack>
        <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('site.courses.search')} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} sx={{ width: { xs: '100%', md: 260 } }} />
      </Stack>
      <Card>
        <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID, gap: 2, px: 2.5, py: 1.25, borderBottom: 1, borderColor: 'divider', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
          <span>{t('site.courses.col.course')}</span>
          <span>{t('site.courses.col.category')}</span>
          <span>{t('site.courses.col.lessons')}</span>
          <span>{t('site.courses.col.status')}</span>
          <span>{t('site.courses.col.onSite')}</span>
          <span />
        </Box>
        {shown.length === 0 && <Typography sx={{ p: 3, color: 'text.secondary' }}>{t('site.courses.empty')}</Typography>}
        {shown.map(row)}
      </Card>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {t('site.courses.showing', { shown: shown.length, total: all.length })}
      </Typography>

      {drawer && (
        <OpenCourseDrawer
          key={drawer.course?.id ?? 'new'}
          course={drawer.course}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            void refetch();
          }}
        />
      )}
    </>
  );
};

OpenCoursesPage.getLayout = layoutFor('ADMIN');
export default OpenCoursesPage;
