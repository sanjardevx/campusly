import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Avatar, Box, Button, Card, Collapse, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useTranslation } from 'next-i18next/pages';
import { SET_SITE_MOCK_TEST_SEATS, SET_SITE_MOCK_TEST_VISIBLE } from '@/apollo/admin/mutation';
import { ADMIN_SITE_MOCK_TESTS } from '@/apollo/admin/query';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { type AdminMockTest, ExamBadge, MockTestDrawer, SeatStepper, SeatsBar, SeatsLeftChip, durationText, examDay, priceText } from '@/libs/components/admin/site/MockTestDrawer';
import { SiteSwitch, StatusPill, UnderlineTabs } from '@/libs/components/admin/site/shared';
import { layoutFor } from '@/libs/components/layout';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['admin', 'teacher']);

type Tab = 'UPCOMING' | 'PAST' | 'ALL';
const GRID = '80px minmax(0, 1fr) 110px 170px 110px 70px 40px';

/**
 * Stitch "Campusly Admin — Website: Mock tests": Upcoming / Past / All, search, a table (exam,
 * title, date, seats bar, status, on-site switch) whose rows open to time, location, price,
 * what's included, the contact, the "Seat registration" − / + (people register by phone),
 * Duplicate and Edit. Past tests leave the site the day after the exam.
 */
const MockTestsPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const { locale = 'en' } = useRouter();
  const { data, refetch } = useQuery(ADMIN_SITE_MOCK_TESTS, { fetchPolicy: 'cache-and-network' });
  const schoolPhone = useQuery(SCHOOL_SETTINGS).data?.schoolSettings.contactPhone ?? null;
  const [setVisible] = useMutation(SET_SITE_MOCK_TEST_VISIBLE);
  const [setSeats] = useMutation(SET_SITE_MOCK_TEST_SEATS);
  const [tab, setTab] = useState<Tab>('UPCOMING');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ test: AdminMockTest | null; copyOf?: AdminMockTest } | null>(null);

  const all = data?.adminSiteMockTests ?? [];
  const upcoming = all.filter((m) => !m.isPast);
  const q = search.trim().toLowerCase();
  const shown = (tab === 'UPCOMING' ? upcoming : tab === 'PAST' ? all.filter((m) => m.isPast) : all).filter(
    (m) => !q || [m.title.en, m.title.uz, m.title.ru, m.title.ko, m.exam].some((s) => s?.toLowerCase().includes(q)),
  );

  const changeSeats = (m: AdminMockTest, takenSeats: number) => setSeats({ variables: { id: m.id, takenSeats } });

  const row = (m: AdminMockTest) => {
    const expanded = open === m.id;
    const left = Math.max(0, m.totalSeats - m.takenSeats);
    const status = m.isPast ? 'past' : left === 0 ? 'full' : 'upcoming';
    const phone = m.contactPhone ?? schoolPhone;
    return (
      <Box key={m.id} sx={{ borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 }, opacity: m.isPast ? 0.7 : 1 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '64px minmax(0, 1fr) 60px 40px', md: GRID }, gap: 2, px: 2.5, py: 1.5, alignItems: 'center' }}>
          <Box>
            <ExamBadge exam={m.exam} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              {m.title.en}
            </Typography>
            <Typography sx={{ display: { md: 'none' }, fontSize: '0.75rem', color: 'text.secondary' }}>
              {examDay(m.examDate, locale)} · {m.takenSeats}/{m.totalSeats}
            </Typography>
          </Box>
          <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.875rem', color: 'text.secondary' }}>{examDay(m.examDate, locale)}</Typography>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: status === 'full' ? '#B42318' : 'text.primary' }}>
                {m.takenSeats} / {m.totalSeats}
              </Typography>
              {m.isPast ? <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('site.mock.completed')}</Typography> : <SeatsLeftChip left={left} />}
            </Stack>
            <SeatsBar taken={m.takenSeats} total={m.totalSeats} past={m.isPast} />
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <StatusPill tone={status === 'past' ? 'grey' : status === 'full' ? 'red' : 'green'}>{t(`site.mock.status.${status}`)}</StatusPill>
          </Box>
          <SiteSwitch checked={m.showOnSite && !m.isPast} label={t('site.mock.onSiteSwitch', { name: m.title.en })} onToggle={(v) => setVisible({ variables: { id: m.id, showOnSite: v } }).then(() => refetch())} />
          <IconButton size="small" onClick={() => setOpen(expanded ? null : m.id)} aria-expanded={expanded} aria-label={expanded ? t('site.collapse') : t('site.expand')}>
            {expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
          </IconButton>
        </Box>
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ mx: 2.5, mb: 2, p: 2.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25 }}>
              <Stack sx={{ gap: 1 }}>
                <Detail label={t('site.mock.time')} value={`${m.startTime} · ${durationText(m.durationMin)}`} />
                <Detail label={t('site.mock.location')} value={m.location.en} />
                <Detail label={t('site.mock.price')} value={priceText(m.price)} strong />
              </Stack>
              <Stack sx={{ gap: 1 }}>
                <Detail label={t('site.mock.included')} value={m.included.en} />
                <Stack direction="row" sx={{ gap: 1, alignItems: 'center', fontSize: '0.875rem' }}>
                  <Box component="span" sx={{ color: 'text.secondary', minWidth: 90 }}>
                    {t('site.mock.contact')}:
                  </Box>
                  {m.contactPerson && <Avatar sx={{ width: 22, height: 22, fontSize: '0.625rem', bgcolor: 'primary.main' }}>{m.contactPerson.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</Avatar>}
                  <span>{[m.contactPerson?.name, phone].filter(Boolean).join(' · ') || '—'}</span>
                </Stack>
              </Stack>
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider', gap: 2, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
              <Box>
                <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{t('site.mock.seatRegistration')}</Typography>
                  <SeatStepper value={m.takenSeats} max={m.totalSeats} onChange={(n) => void changeSeats(m, n)} label={t('site.mock.seatRegistration')} />
                  <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{t('site.mock.ofTotal', { total: m.totalSeats })}</Typography>
                  <SeatsLeftChip left={left} />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  {t('site.mock.byPhone')}
                </Typography>
              </Box>
              <Stack direction="row" sx={{ gap: 1, justifyContent: 'flex-end' }}>
                <Button size="small" variant="outlined" color="inherit" startIcon={<ContentCopyRoundedIcon />} onClick={() => setDrawer({ test: null, copyOf: m })}>
                  {t('site.mock.duplicate')}
                </Button>
                <Button size="small" variant="contained" disableElevation startIcon={<EditOutlinedIcon />} onClick={() => setDrawer({ test: m })}>
                  {t('site.edit')}
                </Button>
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
        title={t('site.mock.pageTitle')}
        subtitle={t('site.mock.pageSubtitle')}
        actions={
          <>
            <Button variant="outlined" color="inherit" endIcon={<NorthEastRoundedIcon />} href="/#mock-tests" target="_blank">
              {t('site.previewOnSite')}
            </Button>
            <Button variant="contained" disableElevation startIcon={<AddRoundedIcon />} onClick={() => setDrawer({ test: null })}>
              {t('site.mock.new')}
            </Button>
          </>
        }
      />
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, mb: 2, alignItems: { md: 'flex-end' } }}>
        <UnderlineTabs
          label={t('site.mock.pageTitle')}
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'UPCOMING', label: t('site.mock.tab.UPCOMING'), count: upcoming.length },
            { key: 'PAST', label: t('site.mock.tab.PAST'), count: all.length - upcoming.length },
            { key: 'ALL', label: t('site.mock.tab.ALL'), count: all.length },
          ]}
        />
        <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('site.mock.search')} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} sx={{ width: { xs: '100%', md: 260 } }} />
      </Stack>
      <Card>
        <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID, gap: 2, px: 2.5, py: 1.25, borderBottom: 1, borderColor: 'divider', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
          <span>{t('site.mock.col.exam')}</span>
          <span>{t('site.mock.col.title')}</span>
          <span>{t('site.mock.col.date')}</span>
          <span>{t('site.mock.col.seats')}</span>
          <span>{t('site.mock.col.status')}</span>
          <span>{t('site.mock.col.onSite')}</span>
          <span />
        </Box>
        {shown.length === 0 && <Typography sx={{ p: 3, color: 'text.secondary' }}>{t('site.mock.empty')}</Typography>}
        {shown.map(row)}
      </Card>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mt: 2, color: 'text.secondary' }}>
        <InfoOutlinedIcon sx={{ fontSize: 18 }} />
        <Typography variant="body2">{t('site.mock.pastHint')}</Typography>
      </Stack>

      {drawer && (
        <MockTestDrawer
          key={drawer.test?.id ?? `new-${drawer.copyOf?.id ?? ''}`}
          test={drawer.test}
          copyOf={drawer.copyOf}
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

function Detail({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction="row" sx={{ gap: 1, fontSize: '0.875rem' }}>
      <Box component="span" sx={{ color: 'text.secondary', minWidth: 90 }}>
        {label}:
      </Box>
      <Box component="span" sx={{ fontWeight: strong ? 700 : 400 }}>
        {value}
      </Box>
    </Stack>
  );
}

MockTestsPage.getLayout = layoutFor('ADMIN');
export default MockTestsPage;
