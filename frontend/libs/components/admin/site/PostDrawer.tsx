import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Button, CircularProgress, FormControlLabel, MenuItem, Radio, RadioGroup, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { useTranslation } from 'next-i18next/pages';
import { ARCHIVE_SITE_POST, SAVE_SITE_POST } from '@/apollo/admin/mutation';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { ConfirmDialog } from '@/libs/components/admin/ConfirmDialog';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { errorCode } from '@/libs/errors';
import type { AdminSitePostsQuery, SitePostType, SitePublishMode } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { utcToZoned, zonedToUtc } from '@/libs/timezone';
import { siteDate } from '@/libs/components/site/tokens';
import { ImagePicker, type ImageValue, LangTabs, LocalizedField, type SiteLang, StatusPill, emptyL, fromL, imageInput, toL } from './shared';
import { postStatus } from './postStatus';

export type AdminPost = AdminSitePostsQuery['adminSitePosts'][number];

const MAX_SLIDES = 5;

/**
 * Stitch "Campusly Admin — Website: Edit Post Drawer": type, title, cover, short description,
 * event details, full text, the home page slider (on / position) and publish now / schedule /
 * draft, with a live preview of the slide. Texts in four languages (tabs, English required).
 * "Archive post" replaces Stitch's "Delete post" (no hard deletes, DECISIONS §5).
 */
export function PostDrawer({
  post,
  carouselCount,
  startInCarousel,
  onClose,
  onSaved,
}: {
  /** null = a new post */
  post: AdminPost | null;
  /** Posts in the slider now (this one not counted) */
  carouselCount: number;
  startInCarousel?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation('admin');
  const { locale = 'en' } = useRouter();
  const errorText = useErrorText();
  const zone = useQuery(SCHOOL_SETTINGS).data?.schoolSettings.timezone ?? 'Asia/Tashkent';
  const [lang, setLang] = useState<SiteLang>('en');
  const [type, setType] = useState<SitePostType>(post?.type ?? 'EVENT');
  const [title, setTitle] = useState(() => toL(post?.title));
  const [summary, setSummary] = useState(() => toL(post?.summary));
  const [body, setBody] = useState(() => (post?.body ? toL(post.body) : emptyL()));
  const [place, setPlace] = useState(() => (post?.place ? toL(post.place) : emptyL()));
  const [cover, setCover] = useState<ImageValue>({ previewUrl: post?.coverUrl ?? null });
  const [eventDate, setEventDate] = useState(post?.eventDate ?? '');
  const [startTime, setStartTime] = useState(post?.startTime ?? '');
  const [endTime, setEndTime] = useState(post?.endTime ?? '');
  const [inCarousel, setInCarousel] = useState(post ? post.carouselPosition !== null : !!startInCarousel);
  const slots = carouselCount + 1;
  const [position, setPosition] = useState(post?.carouselPosition ?? Math.min(slots, MAX_SLIDES));
  // Read once when the drawer opens: is the post waiting for its publish time?
  const [scheduled] = useState(() => post?.status === 'PUBLISHED' && !!post.publishedAt && new Date(post.publishedAt).getTime() > Date.now());
  const [publish, setPublish] = useState<SitePublishMode>(post?.status === 'DRAFT' ? 'DRAFT' : scheduled ? 'SCHEDULE' : post ? 'NOW' : 'DRAFT');
  const [scheduleAt, setScheduleAt] = useState(() => (scheduled ? utcToZoned(post!.publishedAt!, zone) : ''));
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [save, { loading }] = useMutation(SAVE_SITE_POST);
  const [archive, { loading: archiving }] = useMutation(ARCHIVE_SITE_POST);

  const isEvent = type === 'EVENT';
  const full = !inCarousel || post?.carouselPosition != null || carouselCount < MAX_SLIDES;
  const valid =
    title.en.trim() &&
    summary.en.trim() &&
    (!isEvent || eventDate) &&
    (!isEvent || !startTime || !endTime || endTime > startTime) &&
    (publish !== 'SCHEDULE' || scheduleAt) &&
    full;

  const submit = async () => {
    setError(null);
    try {
      await save({
        variables: {
          input: {
            id: post?.id,
            type,
            title: fromL(title)!,
            summary: fromL(summary)!,
            body: fromL(body),
            place: isEvent ? fromL(place) : null,
            eventDate: isEvent ? eventDate : null,
            startTime: isEvent && startTime ? startTime : null,
            endTime: isEvent && endTime ? endTime : null,
            carouselPosition: inCarousel ? position : null,
            publish,
            scheduledAt: publish === 'SCHEDULE' ? zonedToUtc(scheduleAt, zone) : null,
            ...imageInput(cover, { asset: 'coverAssetId', remove: 'removeCover' }),
          },
        },
      });
      onSaved();
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  const status = post ? postStatus(post, locale, t) : null;
  const meta = [eventDate && isEvent ? siteDate(eventDate, locale) : null, isEvent ? place[lang] || place.en : null].filter(Boolean).join(' · ');

  return (
    <>
      <SideDrawer
        open
        title={post ? t('site.posts.edit') : t('site.posts.new')}
        closeLabel={t('site.close')}
        onClose={onClose}
        footer={
          <>
            {post && (
              <Button color="error" startIcon={<Inventory2OutlinedIcon />} onClick={() => setConfirmArchive(true)} disabled={archiving}>
                {t('site.posts.archive')}
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button color="inherit" onClick={onClose}>
              {t('site.cancel')}
            </Button>
            <Button variant="contained" disableElevation onClick={() => void submit()} disabled={!valid || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {post ? t('site.saveChanges') : t('site.create')}
            </Button>
          </>
        }
      >
        {status && (
          <Box sx={{ mt: -1, mb: 2 }}>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
          </Box>
        )}
        <LangTabs
          lang={lang}
          onLang={setLang}
          fields={[title, summary, body, place]}
          onTranslated={([a, b, c, d]) => {
            setTitle(a);
            setSummary(b);
            setBody(c);
            setPlace(d);
          }}
        />

        <DrawerSection title={t('site.posts.basics')}>
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 }}>{t('site.posts.type')}</Typography>
            <ToggleButtonGroup exclusive size="small" value={type} onChange={(_, v: SitePostType | null) => v && setType(v)}>
              <ToggleButton value="EVENT" sx={{ gap: 0.75, px: 2 }}>
                <EventOutlinedIcon fontSize="small" />
                {t('site.posts.event')}
              </ToggleButton>
              <ToggleButton value="NEWS" sx={{ gap: 0.75, px: 2 }}>
                <ArticleOutlinedIcon fontSize="small" />
                {t('site.posts.news')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <LocalizedField id="post-title" label={t('site.posts.title')} value={title} onChange={setTitle} lang={lang} max={150} required />
          <ImagePicker label={t('site.posts.cover')} value={cover} onChange={setCover} hint={t('site.posts.coverHint')} />
          <LocalizedField id="post-summary" label={t('site.posts.summary')} value={summary} onChange={setSummary} lang={lang} max={160} rows={2} required helper={t('site.posts.summaryHint')} />
        </DrawerSection>

        {isEvent && (
          <DrawerSection title={t('site.posts.eventDetails')}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField id="post-date" type="date" label={t('site.posts.date')} value={eventDate} onChange={(e) => setEventDate(e.target.value)} size="small" required slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1.4 }} />
              <TextField id="post-start" type="time" label={t('site.posts.start')} value={startTime} onChange={(e) => setStartTime(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
              <TextField id="post-end" type="time" label={t('site.posts.end')} value={endTime} onChange={(e) => setEndTime(e.target.value)} size="small" error={!!startTime && !!endTime && endTime <= startTime} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
            </Stack>
            <LocalizedField id="post-place" label={t('site.posts.place')} value={place} onChange={setPlace} lang={lang} max={120} />
          </DrawerSection>
        )}

        <DrawerSection title={t('site.posts.fullText')}>
          <LocalizedField id="post-body" label={t('site.posts.fullText')} value={body} onChange={setBody} lang={lang} max={20000} markdown />
        </DrawerSection>

        <DrawerSection title={t('site.posts.onSite')}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <FormControlLabel control={<Switch checked={inCarousel} onChange={(e) => setInCarousel(e.target.checked)} />} label={t('site.posts.showInCarousel')} />
            {inCarousel && full && (
              <TextField select size="small" value={position} onChange={(e) => setPosition(Number(e.target.value))} aria-label={t('site.posts.position')} sx={{ minWidth: 160 }}>
                {Array.from({ length: Math.min(slots, MAX_SLIDES) }, (_, i) => i + 1).map((n) => (
                  <MenuItem key={n} value={n}>
                    {t('site.posts.positionOf', { n, total: Math.min(slots, MAX_SLIDES) })}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
          {!full && <Alert severity="warning">{t('site.posts.carouselFull')}</Alert>}
          <RadioGroup value={publish} onChange={(e) => setPublish(e.target.value as SitePublishMode)}>
            <FormControlLabel value="NOW" control={<Radio size="small" />} label={t('site.posts.publishNow')} />
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControlLabel value="SCHEDULE" control={<Radio size="small" />} label={t('site.posts.schedule')} />
              <TextField type="datetime-local" size="small" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} disabled={publish !== 'SCHEDULE'} aria-label={t('site.posts.schedule')} helperText={publish === 'SCHEDULE' ? t('site.posts.zone', { zone: zone.split('/').pop() }) : undefined} />
            </Stack>
            <FormControlLabel value="DRAFT" control={<Radio size="small" />} label={t('site.posts.draft')} />
          </RadioGroup>
        </DrawerSection>

        <DrawerSection title={t('site.preview')}>
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            {t('site.posts.previewHint')}
          </Typography>
          <Stack direction="row" sx={{ borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider', bgcolor: '#fff', minHeight: 150 }}>
            <Box sx={{ width: '45%', bgcolor: 'action.hover', flexShrink: 0 }}>{cover.previewUrl && <Box component="img" src={cover.previewUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}</Box>
            <Stack sx={{ p: 2, gap: 0.75, minWidth: 0 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ bgcolor: '#E8EFEA', color: '#1F4E43', px: 1, py: 0.25, borderRadius: 999, fontSize: '0.6875rem', fontWeight: 600 }}>{isEvent ? t('site.posts.event') : t('site.posts.news')}</Box>
                {meta && <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{meta}</Typography>}
              </Stack>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.3 }}>{title[lang] || title.en || t('site.posts.title')}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{summary[lang] || summary.en}</Typography>
            </Stack>
          </Stack>
        </DrawerSection>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </SideDrawer>
      <ConfirmDialog
        open={confirmArchive}
        title={t('site.posts.archiveTitle')}
        body={t('site.posts.archiveBody')}
        confirmLabel={t('site.posts.archive')}
        danger
        busy={archiving}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() =>
          void archive({ variables: { id: post!.id } }).then(() => {
            setConfirmArchive(false);
            onSaved();
          })
        }
      />
    </>
  );
}
