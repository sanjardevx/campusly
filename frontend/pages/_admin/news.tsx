import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Box, Button, ButtonBase, Card, Collapse, IconButton, InputAdornment, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { useTranslation } from 'next-i18next/pages';
import { ADMIN_SITE_POSTS } from '@/apollo/admin/query';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { type AdminPost, PostDrawer } from '@/libs/components/admin/site/PostDrawer';
import { isPast, postStatus } from '@/libs/components/admin/site/postStatus';
import { StatusPill } from '@/libs/components/admin/site/shared';
import { layoutFor } from '@/libs/components/layout';
import { siteDate } from '@/libs/components/site/tokens';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['admin', 'teacher']);

type Tab = 'ALL' | 'EVENT' | 'NEWS';
type When = 'upcoming' | 'all' | 'carousel' | 'past';

const GRID = '64px minmax(0, 1fr) 130px 190px 110px 40px';

/**
 * Stitch "Campusly Admin — Website: News & Events": All / Events / News with counts, a date filter
 * and search; compact rows (picture, title + type, date, status, slider star, expand) that open to
 * time, place, who published, the slider position and the short text. The drawer edits a post.
 */
const NewsPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const { locale = 'en' } = useRouter();
  const { data, refetch } = useQuery(ADMIN_SITE_POSTS, { fetchPolicy: 'cache-and-network' });
  const [tab, setTab] = useState<Tab>('ALL');
  const [when, setWhen] = useState<When>('upcoming');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ post: AdminPost | null; carousel?: boolean } | null>(null);

  // Newest first by the date the list shows (the event day, or when news was published)
  const posts = useMemo(
    () => [...(data?.adminSitePosts ?? [])].sort((a, b) => (b.eventDate ?? b.publishedAt ?? b.updatedAt).localeCompare(a.eventDate ?? a.publishedAt ?? a.updatedAt)),
    [data],
  );
  const inCarousel = posts.filter((p) => p.carouselPosition !== null);
  const q = search.trim().toLowerCase();
  const byWhen = posts.filter((p) =>
    when === 'all' ? true : when === 'carousel' ? p.carouselPosition !== null : when === 'past' ? isPast(p) : !isPast(p),
  );
  const shown = byWhen
    .filter((p) => tab === 'ALL' || p.type === tab)
    .filter((p) => !q || [p.title.en, p.title.uz, p.title.ru, p.title.ko].some((s) => s?.toLowerCase().includes(q)));
  const count = (k: Tab) => byWhen.filter((p) => k === 'ALL' || p.type === k).length;
  const date = (p: AdminPost) => (p.eventDate ? siteDate(p.eventDate, locale) : p.publishedAt ? siteDate(p.publishedAt.slice(0, 10), locale) : '—');

  const close = () => setDrawer(null);
  const saved = () => {
    setDrawer(null);
    void refetch();
  };

  return (
    <>
      <PageHeader
        title={t('site.posts.pageTitle')}
        subtitle={t('site.posts.pageSubtitle')}
        actions={
          <>
            <Button variant="outlined" color="inherit" endIcon={<NorthEastRoundedIcon />} href="/#news" target="_blank">
              {t('site.previewOnSite')}
            </Button>
            <Button variant="contained" disableElevation startIcon={<PostAddOutlinedIcon />} onClick={() => setDrawer({ post: null })}>
              {t('site.posts.new')}
            </Button>
          </>
        }
      />

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, mb: 2, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
        <Stack direction="row" sx={{ gap: 0.5, p: 0.5, borderRadius: 2, bgcolor: 'action.hover', alignSelf: 'flex-start' }} role="tablist">
          {(['ALL', 'EVENT', 'NEWS'] as const).map((k) => (
            <ButtonBase key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} sx={{ px: 1.75, py: 0.75, borderRadius: 1.5, gap: 1, fontSize: '0.875rem', fontWeight: 600, color: tab === k ? 'text.primary' : 'text.secondary', bgcolor: tab === k ? 'background.paper' : 'transparent', boxShadow: tab === k ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
              {t(`site.posts.tab.${k}`)}
              <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                {count(k)}
              </Box>
            </ButtonBase>
          ))}
        </Stack>
        <Stack direction="row" sx={{ gap: 1.5 }}>
          <TextField select size="small" value={when} onChange={(e) => setWhen(e.target.value as When)} sx={{ minWidth: 190 }} aria-label={t('site.posts.when.label')}>
            {(['upcoming', 'all', 'carousel', 'past'] as const).map((k) => (
              <MenuItem key={k} value={k}>
                {t(`site.posts.when.${k}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('site.posts.search')} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} sx={{ width: { xs: '100%', md: 240 } }} />
        </Stack>
      </Stack>

      <Card>
        <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID, gap: 2, px: 2.5, py: 1.25, borderBottom: 1, borderColor: 'divider', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
          <span>{t('site.posts.col.post')}</span>
          <span>{t('site.posts.col.title')}</span>
          <span>{t('site.posts.col.date')}</span>
          <span>{t('site.posts.col.status')}</span>
          <span>{t('site.posts.col.carousel')}</span>
          <span />
        </Box>
        {shown.length === 0 && <Typography sx={{ p: 3, color: 'text.secondary' }}>{t('site.posts.empty')}</Typography>}
        {shown.map((p) => {
          const expanded = open === p.id;
          const status = postStatus(p, locale, t);
          const past = status.label === t('site.posts.status.past');
          return (
            <Box key={p.id} sx={{ borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 }, opacity: past ? 0.7 : 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '56px minmax(0, 1fr) 40px', md: GRID }, gap: 2, px: 2.5, py: 1.25, alignItems: 'center' }}>
                <Box sx={{ width: 56, height: 40, borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>{p.coverUrl && <Box component="img" src={p.coverUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', filter: past ? 'grayscale(1)' : 'none' }} />}</Box>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {p.title.en}
                  </Typography>
                  <Box sx={{ flexShrink: 0, px: 1, py: 0.125, borderRadius: 1, fontSize: '0.6875rem', fontWeight: 600, bgcolor: p.type === 'EVENT' ? '#E8EFEA' : '#EEF2FF', color: p.type === 'EVENT' ? '#1F4E43' : '#3730A3' }}>{p.type === 'EVENT' ? t('site.posts.event') : t('site.posts.news')}</Box>
                </Stack>
                <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.875rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{date(p)}</Typography>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                </Box>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  {p.carouselPosition !== null ? (
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, color: '#B45309', fontWeight: 700, fontSize: '0.875rem' }}>
                      <StarRoundedIcon fontSize="small" />
                      {p.carouselPosition}
                    </Stack>
                  ) : (
                    <Tooltip title={inCarousel.length >= 5 ? t('site.posts.carouselFull') : t('site.posts.addToCarousel')}>
                      <span>
                        <IconButton size="small" disabled={inCarousel.length >= 5} onClick={() => setDrawer({ post: p, carousel: true })} aria-label={t('site.posts.addToCarousel')}>
                          <StarBorderRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
                <IconButton size="small" onClick={() => setOpen(expanded ? null : p.id)} aria-expanded={expanded} aria-label={expanded ? t('site.collapse') : t('site.expand')}>
                  {expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                </IconButton>
              </Box>
              <Collapse in={expanded} unmountOnExit>
                <Box sx={{ mx: 2.5, mb: 2, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, fontSize: '0.875rem' }}>
                    {p.type === 'EVENT' && <Detail label={t('site.posts.time')} value={p.startTime ? [p.startTime, p.endTime].filter(Boolean).join('–') : '—'} />}
                    {p.type === 'EVENT' && <Detail label={t('site.posts.place')} value={p.place?.en ?? '—'} />}
                    <Detail label={t('site.posts.published')} value={p.publishedAt ? t('site.posts.publishedBy', { date: siteDate(p.publishedAt.slice(0, 10), locale), name: p.editedBy }) : t('site.posts.status.draft')} />
                    <Detail label={t('site.posts.carousel')} value={p.carouselPosition !== null ? t('site.posts.positionOf', { n: p.carouselPosition, total: inCarousel.length }) : '—'} />
                    <Box sx={{ display: { md: 'none' } }}>
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </Box>
                  </Box>
                  <Typography sx={{ mt: 1, fontSize: '0.875rem' }}>
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      {t('site.posts.summary')}:{' '}
                    </Box>
                    {p.summary.en}
                  </Typography>
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
                    <Button size="small" color="inherit" endIcon={<NorthEastRoundedIcon />} href={`/?post=${p.id}#news`} target="_blank" disabled={p.status !== 'PUBLISHED'}>
                      {t('site.viewOnSite')}
                    </Button>
                    <Button size="small" variant="contained" disableElevation startIcon={<EditOutlinedIcon />} onClick={() => setDrawer({ post: p })}>
                      {t('site.edit')}
                    </Button>
                  </Stack>
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Card>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mt: 2, color: 'text.secondary' }}>
        <InfoOutlinedIcon sx={{ fontSize: 18 }} />
        <Typography variant="body2">{t('site.posts.footnote')}</Typography>
      </Stack>

      {drawer && (
        <PostDrawer
          key={drawer.post?.id ?? 'new'}
          post={drawer.post}
          startInCarousel={drawer.carousel}
          carouselCount={inCarousel.filter((p) => p.id !== drawer.post?.id).length}
          onClose={close}
          onSaved={saved}
        />
      )}
    </>
  );
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Typography sx={{ fontSize: '0.875rem' }}>
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {label}:{' '}
      </Box>
      {value}
    </Typography>
  );
}

NewsPage.getLayout = layoutFor('ADMIN');
export default NewsPage;
