import { useState } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
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
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from 'next-i18next/pages';
import { ARCHIVE_ANNOUNCEMENT, UPDATE_ANNOUNCEMENT } from '@/apollo/teacher/mutation';
import { COURSE_FILE_URL, TEACHER_ANNOUNCEMENTS, TEACHING_COURSES } from '@/apollo/teacher/query';
import { layoutFor } from '@/libs/components/layout';
import { AnnouncementDrawer } from '@/libs/components/teacher/announcements/AnnouncementDrawer';
import { formatLocal } from '@/libs/components/teacher/grading/model';
import { errorCode } from '@/libs/errors';
import type { TeacherAnnouncementsQuery } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['teacher']);

type Item = TeacherAnnouncementsQuery['announcements']['list'][number];
const PAGE = 20;

/** Markdown marks out, for the one-line preview */
const plain = (md: string) => md.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_#>`-]/g, '').replace(/\s+/g, ' ').trim();

/**
 * Stitch "Teacher Announcements (New Announcement Drawer Open)": the teacher's course announcements
 * (and the school's), pinned first then newest, with "52 / 56 read". New ones go to several courses
 * at once; ⋯ edits, pins or archives one (never deletes).
 */
const AnnouncementsPage: NextPageWithLayout = () => {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const router = useRouter();
  const { locale } = router;
  const client = useApolloClient();
  const courseId = typeof router.query.course === 'string' ? router.query.course : undefined;
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [drawer, setDrawer] = useState<{ item: Item | null } | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; item: Item } | null>(null);
  const [archive, setArchive] = useState<Item | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const { data: coursesData } = useQuery(TEACHING_COURSES);
  const courses = (coursesData?.teachingCourses ?? []).filter((c) => c.status === 'ACTIVE');
  const { data, error, loading } = useQuery(TEACHER_ANNOUNCEMENTS, {
    variables: { input: { courseId, search: query || undefined, limit } },
    fetchPolicy: 'cache-and-network',
  });
  const refetch = { refetchQueries: ['TeacherAnnouncements', 'TeacherDashboard'] };
  const [update] = useMutation(UPDATE_ANNOUNCEMENT, refetch);
  const [doArchive, archiveState] = useMutation(ARCHIVE_ANNOUNCEMENT, refetch);

  const list = data?.announcements.list ?? [];
  const total = data?.announcements.total ?? 0;
  const mine = new Set(courses.map((c) => c.id));
  const canEdit = (a: Item) => !!a.courseId && mine.has(a.courseId);

  const setCourse = (value: string) => {
    const q = { ...router.query, course: value || undefined };
    if (!value) delete q.course;
    void router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
    setLimit(PAGE);
  };

  const openFile = async (fileId: string) => {
    const tab = window.open('', '_blank');
    try {
      const res = await client.query({ query: COURSE_FILE_URL, variables: { assetId: fileId }, fetchPolicy: 'network-only' });
      if (tab) tab.location.href = res.data!.courseFileUrl.url;
    } catch (err) {
      tab?.close();
      setToast({ tone: 'error', text: errorText(errorCode(err)) });
    }
  };

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      setToast({ tone: 'success', text: done });
    } catch (err) {
      setToast({ tone: 'error', text: errorText(errorCode(err)) });
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}>
        <Box>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
            {t('announcements.pageTitle')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
            {t('announcements.subtitle')}
          </Typography>
        </Box>
        <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={() => setDrawer({ item: null })} disabled={!courses.length}>
          {t('announcements.new')}
        </Button>
      </Stack>

      {/* Course filter + search */}
      <Card variant="outlined" sx={{ borderRadius: '12px', p: 1, display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' } }}>
        <Select size="small" value={courseId ?? ''} displayEmpty onChange={(e) => setCourse(e.target.value)} sx={{ minWidth: 230, fontSize: '0.875rem' }} inputProps={{ 'aria-label': t('gradebook.course') }}>
          <MenuItem value="">{t('announcements.allCourses', { count: courses.length })}</MenuItem>
          {courses.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.title}
            </MenuItem>
          ))}
        </Select>
        <TextField
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setQuery(search.trim()), setLimit(PAGE))}
          onBlur={() => setQuery(search.trim())}
          placeholder={t('announcements.search')}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap', px: 1 }}>
          {t('announcements.sorted')}
        </Typography>
      </Card>

      {error && <Alert severity="error">{errorText(errorCode(error))}</Alert>}

      <Card variant="outlined" sx={{ borderRadius: '12px' }}>
        {!data && loading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : list.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
            {query ? t('announcements.noMatch') : t('announcements.none')}
          </Typography>
        ) : (
          <Stack sx={{ '& > * + *': { borderTop: 1, borderColor: 'divider' } }}>
            {list.map((a) => {
              const everyone = a.audience != null && a.audience > 0 && (a.studentReads ?? 0) >= a.audience;
              return (
                <Box key={a.id} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, '&:hover': { bgcolor: '#FBFDFB' } }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                    <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center', minWidth: 0 }}>
                      {a.isPinned && (
                        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, px: 1, py: 0.25, borderRadius: 999, bgcolor: 'warning.light', color: 'warning.dark', border: 1, borderColor: '#FDE68A', fontSize: '0.75rem', fontWeight: 600 }}>
                          <PushPinOutlinedIcon sx={{ fontSize: 14 }} />
                          {t('announcements.pinned')}
                        </Stack>
                      )}
                      <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                        {a.title}
                      </Typography>
                      <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 999, bgcolor: 'primary.light', color: 'primary.main', border: 1, borderColor: '#D5E4D9', fontSize: '0.75rem', fontWeight: 500 }}>
                        {a.courseTitle ?? t('dashboard.announcements.school')}
                      </Box>
                    </Stack>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', fontVariantNumeric: 'tabular-nums', display: { xs: 'none', sm: 'block' } }}>
                        {t('announcements.posted', { date: formatLocal(a.publishedAt, locale) })}
                      </Typography>
                      {canEdit(a) && (
                        <IconButton size="small" onClick={(e) => setMenu({ el: e.currentTarget, item: a })} aria-label={t('course.item.more')}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  </Stack>
                  <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: 900 }}>
                    {plain(a.body)}
                  </Typography>
                  <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    {a.audience != null && (
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, px: 1, py: 0.25, borderRadius: 1, bgcolor: 'success.light', color: 'success.main', border: 1, borderColor: '#CFE3D6', fontSize: '0.75rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {everyone ? <DoneAllIcon sx={{ fontSize: 15 }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
                        {t('dashboard.announcements.read', { reads: a.studentReads ?? 0, audience: a.audience })}
                      </Stack>
                    )}
                    {a.files.length > 0 && (
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={<AttachFileIcon sx={{ fontSize: 15 }} />}
                        onClick={() => openFile(a.files[0].id)}
                        sx={{ fontSize: '0.75rem', color: 'text.secondary', border: 1, borderColor: 'divider', py: 0, px: 1 }}
                      >
                        {t('announcements.attachmentCount', { count: a.files.length, name: a.files[0].name })}
                      </Button>
                    )}
                    {a.authorRole === 'ADMIN' && <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>{t('announcements.byAdmin', { name: a.authorName })}</Typography>}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Card>

      {list.length < total && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="outlined" color="inherit" onClick={() => setLimit((n) => n + PAGE)} disabled={loading} sx={{ borderColor: 'divider' }}>
            {t('announcements.more', { shown: list.length, total })}
          </Button>
        </Box>
      )}

      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            setDrawer({ item: menu!.item });
            setMenu(null);
          }}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('course.item.edit')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            const item = menu!.item;
            setMenu(null);
            void run(() => update({ variables: { input: { id: item.id, isPinned: !item.isPinned } } }), item.isPinned ? t('announcements.unpinned') : t('announcements.pinnedDone'));
          }}
        >
          <ListItemIcon>
            <PushPinOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{menu?.item.isPinned ? t('announcements.unpin') : t('announcements.pinAction')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setArchive(menu!.item);
            setMenu(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <ArchiveOutlinedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>{t('announcements.archive')}</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={!!archive} onClose={() => setArchive(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('announcements.archiveTitle')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{t('announcements.archiveBody', { title: archive?.title })}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" color="inherit" onClick={() => setArchive(null)} sx={{ borderColor: 'divider' }}>
            {t('course.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            disableElevation
            disabled={archiveState.loading}
            onClick={async () => {
              const item = archive!;
              setArchive(null);
              await run(() => doArchive({ variables: { id: item.id } }), t('announcements.archived'));
            }}
          >
            {t('announcements.archive')}
          </Button>
        </DialogActions>
      </Dialog>

      {drawer && <AnnouncementDrawer courses={courses} announcement={drawer.item} defaultCourse={courseId} onClose={() => setDrawer(null)} />}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.tone ?? 'success'} variant="filled" onClose={() => setToast(null)}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </Stack>
  );
};

AnnouncementsPage.getLayout = layoutFor('TEACHER');
export default AnnouncementsPage;
