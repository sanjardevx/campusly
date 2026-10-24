import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Button, ButtonBase, Card, CircularProgress, Collapse, InputAdornment, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'next-i18next/pages';
import { MARK_ALL_ANNOUNCEMENTS_READ, MARK_ANNOUNCEMENT_READ } from '@/apollo/student/mutation';
import { STUDENT_ANNOUNCEMENTS } from '@/apollo/student/query';
import { MarkdownText } from '@/libs/components/MarkdownText';
import { STITCH, SegmentedTabs, enter, liftSx, pressSx } from '@/libs/components/student/home/parts';
import { FileChip, Soon } from '@/libs/components/student/homework/HomeworkView';
import { errorCode } from '@/libs/errors';
import type { StudentAnnouncementsQuery } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';

type Item = StudentAnnouncementsQuery['announcements']['list'][number];
type Tab = 'all' | 'unread' | 'school';
const PAGE = 10;

/** Markdown marks out, for the one-line preview */
const plain = (md: string) => md.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_#>`-]/g, '').replace(/\s+/g, ' ').trim();

/** "Oct 13" (this year) or "Oct 13, 2025", in the viewer's timezone */
function shortDate(iso: string, locale = 'en') {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

/**
 * Stitch "Announcements (Student Portal)" (DECISIONS §10): All / Unread / School tabs with counts,
 * course filter, search, pinned first; a card opens to the full text and files (opening marks it
 * read), "Mark all as read", 10 at a time with "Load more". A parent passes the chosen child
 * (studentId): school-wide plus that child's courses.
 */
export function AnnouncementsView({ courses, studentId }: { courses: { id: string; title: string }[]; studentId?: string }) {
  const { t } = useTranslation('student');
  const errorText = useErrorText();
  const { locale } = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [courseId, setCourseId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);

  const input = { studentId, courseId: courseId || undefined, search: query || undefined, unreadOnly: tab === 'unread' || undefined, schoolOnly: tab === 'school' || undefined, limit };
  const { data, previousData, error, loading } = useQuery(STUDENT_ANNOUNCEMENTS, { variables: { input }, fetchPolicy: 'cache-and-network' });
  const result = (data ?? previousData)?.announcements;

  // The opened card stays in the list (even on the Unread tab); only the counts go down by one
  const [markRead] = useMutation(MARK_ANNOUNCEMENT_READ, {
    update(cache) {
      cache.modify({
        fields: {
          announcements: (existing) =>
            existing && 'unread' in existing && typeof existing.unread === 'number' ? { ...existing, unread: Math.max(0, existing.unread - 1) } : existing,
        },
      });
    },
  });
  const [markAll, markAllState] = useMutation(MARK_ALL_ANNOUNCEMENTS_READ, { refetchQueries: ['StudentAnnouncements', 'UnreadAnnouncements'] });
  const [actionError, setActionError] = useState<string | null>(null);

  const toggle = (item: Item) => {
    const next = open === item.id ? null : item.id;
    setOpen(next);
    if (next && !item.isRead) void markRead({ variables: { id: item.id } }).catch(() => undefined);
  };
  const reset = () => {
    setLimit(PAGE);
    setOpen(null);
  };

  const list = result?.list ?? [];
  const total = result?.total ?? 0;
  const tabs = [
    { id: 'all', label: t('announcements.tabs.all', { count: result?.all ?? 0 }) },
    { id: 'unread', label: t('announcements.tabs.unread', { count: result?.unread ?? 0 }) },
    { id: 'school', label: t('announcements.tabs.school', { count: result?.school ?? 0 }) },
  ];
  const emptyText = query ? t('announcements.noMatch') : tab === 'unread' ? t('announcements.allRead') : t('announcements.none');

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 960, width: '100%', mx: 'auto' }}>
      <Box>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: STITCH.ink, letterSpacing: '-0.01em' }}>
          {t('announcements.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
          {t('announcements.subtitle')}
        </Typography>
      </Box>

      {/* Tabs on the left; course filter + search on the right */}
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 1.5, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
        <SegmentedTabs
          tabs={tabs}
          value={tab}
          onChange={(id) => {
            setTab(id as Tab);
            reset();
          }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1 }}>
          <Select
            size="small"
            value={courseId}
            displayEmpty
            onChange={(e) => {
              setCourseId(e.target.value);
              reset();
            }}
            sx={{ minWidth: 170, fontSize: '0.875rem', bgcolor: '#fff' }}
            inputProps={{ 'aria-label': t('announcements.course') }}
          >
            <MenuItem value="">{t('announcements.allCourses')}</MenuItem>
            {courses.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.title}
              </MenuItem>
            ))}
          </Select>
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setQuery(search.trim());
                reset();
              }
            }}
            onBlur={() => setQuery(search.trim())}
            placeholder={t('announcements.search')}
            sx={{ minWidth: { sm: 240 }, bgcolor: '#fff' }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          />
        </Stack>
      </Stack>

      {(error || actionError) && <Alert severity="error">{actionError ?? errorText(errorCode(error))}</Alert>}

      {!result ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : list.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: '12px', p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">{emptyText}</Typography>
        </Card>
      ) : (
        // The last tab's list stays, dimmed, until the new one arrives
        <Stack spacing={1.5} aria-busy={!data} sx={{ opacity: data ? 1 : 0.55, transition: 'opacity 150ms ease' }}>
          {list.map((item, i) => (
            <AnnouncementCard key={item.id} item={item} index={i} open={open === item.id} onToggle={() => toggle(item)} locale={locale} />
          ))}
        </Stack>
      )}

      {result && (
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5, justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <Button
            size="small"
            color="inherit"
            startIcon={<DoneAllRoundedIcon />}
            disabled={!result.unread || markAllState.loading}
            onClick={async () => {
              setActionError(null);
              try {
                await markAll({ variables: { studentId } });
              } catch (err) {
                setActionError(errorText(errorCode(err)));
              }
            }}
            sx={{ ...pressSx, alignSelf: 'flex-start', color: 'text.secondary', fontWeight: 600 }}
          >
            {t('announcements.markAll')}
          </Button>
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
            {total > 0 && (
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                {t('announcements.showing', { shown: list.length, total })}
              </Typography>
            )}
            {list.length < total && (
              <Button variant="outlined" color="inherit" size="small" onClick={() => setLimit((n) => n + PAGE)} disabled={loading} sx={{ ...pressSx, borderColor: 'divider' }}>
                {t('announcements.loadMore')}
              </Button>
            )}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}

/** One card: a single line when closed; the full text, files and Q&A link when open */
function AnnouncementCard({ item, index, open, onToggle, locale }: { item: Item; index: number; open: boolean; onToggle: () => void; locale?: string }) {
  const { t } = useTranslation('student');
  const meta = `${item.courseId ? item.authorName : t('announcements.schoolAdmin')} · ${shortDate(item.publishedAt, locale)}`;

  return (
    <Card
      variant="outlined"
      sx={{
        ...enter(index),
        ...(open ? {} : liftSx),
        position: 'relative',
        borderRadius: '12px',
        borderColor: open ? '#C9D3CD' : STITCH.outline,
        boxShadow: STITCH.rowShadow,
      }}
    >
      <ButtonBase
        onClick={onToggle}
        aria-expanded={open}
        sx={{ width: '100%', textAlign: 'left', px: { xs: 2, md: 2.5 }, py: open ? 2.25 : 1.75, display: 'flex', alignItems: 'flex-start', gap: 1.25 }}
      >
        {/* Unread dot (the space stays so titles line up) */}
        <Box aria-label={item.isRead ? undefined : t('announcements.unreadDot')} sx={{ width: 8, height: 8, mt: '7px', borderRadius: '50%', flexShrink: 0, bgcolor: item.isRead ? 'transparent' : 'primary.main', transition: 'background-color 200ms ease' }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: open ? 'wrap' : 'nowrap', minWidth: 0 }}>
            {item.isPinned && (
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, px: 1, py: 0.25, borderRadius: 1, bgcolor: 'warning.light', color: 'warning.dark', border: 1, borderColor: '#FDE68A', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                <PushPinOutlinedIcon sx={{ fontSize: 13 }} />
                {t('announcements.pinned')}
              </Stack>
            )}
            <Typography component="h2" noWrap={!open} sx={{ fontWeight: item.isRead ? 600 : 700, fontSize: open ? '1rem' : '0.9375rem', color: STITCH.ink, minWidth: 0, maxWidth: open ? 'none' : { md: 260 } }}>
              {item.title}
            </Typography>
            <CoursePill title={item.courseTitle} />
            {!open && (
              <Typography noWrap sx={{ display: { xs: 'none', md: 'block' }, flex: 1, minWidth: 0, fontSize: '0.8125rem', color: 'text.secondary' }}>
                — {plain(item.body)}
              </Typography>
            )}
            <Typography noWrap sx={{ display: { xs: 'none', sm: 'block' }, ml: 'auto', flexShrink: 0, fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
              {meta}
            </Typography>
          </Stack>
          {/* Phones: the meta line moves under the title */}
          <Typography sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5, fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{meta}</Typography>
        </Box>
        {!open && <ChevronRightRoundedIcon sx={{ color: 'text.secondary', fontSize: 20, mt: '1px', flexShrink: 0 }} />}
      </ButtonBase>

      <Collapse in={open} unmountOnExit timeout={{ enter: 220, exit: 160 }}>
        <Box sx={{ px: { xs: 2, md: 2.5 }, pb: 2, pl: { xs: 4.25, md: 4.75 } }}>
          <MarkdownText text={item.body} sx={{ fontSize: '0.9375rem', lineHeight: 1.6 }} />
          {item.files.length > 0 && (
            <Stack sx={{ gap: 1, mt: 2, alignItems: 'flex-start' }}>
              {item.files.map((f) => (
                <FileChip key={f.id} assetId={f.id} name={f.name} mimeType={f.mimeType} size={f.size} />
              ))}
            </Stack>
          )}
          <Stack direction="row" sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: STITCH.outline, justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Soon icon={<ForumOutlinedIcon />} label={t('announcements.ask')} />
            <Button size="small" color="inherit" endIcon={<ExpandLessRoundedIcon />} onClick={onToggle} sx={{ ...pressSx, color: 'text.secondary', fontWeight: 600 }}>
              {t('announcements.collapse')}
            </Button>
          </Stack>
        </Box>
      </Collapse>
    </Card>
  );
}

/** Course name on the sage wash; school-wide ones get the neutral "School" pill */
function CoursePill({ title }: { title: string | null }) {
  const { t } = useTranslation('student');
  return (
    <Box
      component="span"
      sx={{
        px: 1,
        py: 0.125,
        borderRadius: 999,
        border: 1,
        fontSize: '0.75rem',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...(title ? { bgcolor: '#E8EFEA', color: '#3E6B5C', borderColor: '#D5E4D9' } : { bgcolor: '#F1F2F0', color: '#5C625E', borderColor: '#E3E5DF' }),
      }}
    >
      {title ?? t('announcements.school')}
    </Box>
  );
}
