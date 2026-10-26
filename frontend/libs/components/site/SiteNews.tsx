import { useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, ButtonBase, Dialog, DialogContent, IconButton, Stack, Typography } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from 'next-i18next/pages';
import { MarkdownText } from '@/libs/components/MarkdownText';
import { useReducedMotion } from '@/libs/components/dashboard/motion';
import { SITE, type SiteData, containerSx, eyebrowSx, sectionTitleSx, siteDate } from './tokens';

type Post = SiteData['posts'][number];

const roundBtn = {
  width: 40,
  height: 40,
  border: `1px solid ${SITE.neutral300}`,
  bgcolor: '#fff',
  color: '#404040',
  '&:hover': { bgcolor: '#FAFAFA', borderColor: '#A3A3A3' },
} as const;

/** "Oct 24, 2026 · Main Hall · 10:00" (the dialog shows the end time too: "10:00–13:00") */
function meta(post: Post, locale: string, withEnd = false) {
  const time = withEnd && post.startTime && post.endTime ? `${post.startTime}–${post.endTime}` : post.startTime;
  return [siteDate(post.date, locale), post.place, time].filter(Boolean).join(' · ');
}

/**
 * Stitch "Landing Page (Part A)" → News & Events: one large card at a time (photo 55 %, text 45 %),
 * round prev / next buttons by the title, dots under the text. Phones: photo on top, the arrows
 * and dots under the card. A post with full text opens it in a dialog ("Read more").
 */
export function SiteNews({ posts }: { posts: Post[] }) {
  const { t } = useTranslation('site');
  const { locale = 'en', query } = useRouter();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  // ?post=<id> (the CMS's "View on site") opens that post
  const [open, setOpen] = useState<Post | null>(() => posts.find((p) => p.id === query.post) ?? null);

  if (posts.length === 0) {
    return (
      <Box component="section" id="news" sx={{ ...containerSx, pt: 10, pb: 8 }}>
        <Typography sx={eyebrowSx}>{t('news.eyebrow')}</Typography>
        <Typography component="h2" sx={sectionTitleSx}>
          {t('news.title')}
        </Typography>
        <Typography sx={{ mt: 2, color: SITE.neutral500 }}>{t('news.empty')}</Typography>
      </Box>
    );
  }

  const post = posts[index];
  const go = (step: number) => setIndex((i) => (i + step + posts.length) % posts.length);
  const prev = (
    <IconButton onClick={() => go(-1)} aria-label={t('news.prev')} sx={roundBtn}>
      <ChevronLeftRoundedIcon />
    </IconButton>
  );
  const next = (
    <IconButton onClick={() => go(1)} aria-label={t('news.next')} sx={roundBtn}>
      <ChevronRightRoundedIcon />
    </IconButton>
  );
  const dots = (
    <Stack direction="row" sx={{ gap: 1 }}>
      {posts.map((p, i) => (
        <ButtonBase key={p.id} onClick={() => setIndex(i)} aria-label={t('news.goTo', { n: i + 1 })} aria-current={i === index} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: i === index ? SITE.spruce : SITE.neutral300 }} />
      ))}
    </Stack>
  );

  return (
    <Box component="section" id="news" sx={{ ...containerSx, pt: { xs: 8, md: 10 }, pb: 8 }}>
      <Stack direction="row" sx={{ alignItems: 'flex-end', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography sx={{ ...eyebrowSx, mb: 0.5 }}>{t('news.eyebrow')}</Typography>
          <Typography component="h2" sx={sectionTitleSx}>
            {t('news.title')}
          </Typography>
        </Box>
        {posts.length > 1 && (
          <Stack direction="row" sx={{ gap: 1, display: { xs: 'none', md: 'flex' } }}>
            {prev}
            {next}
          </Stack>
        )}
      </Stack>

      <Box
        key={post.id}
        component="article"
        sx={{
          borderRadius: '16px',
          overflow: 'hidden',
          bgcolor: '#fff',
          border: '1px solid rgba(229,229,229,0.8)',
          boxShadow: SITE.cardShadow,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          minHeight: { md: 380 },
          animation: reduced ? 'none' : 'siteFade 400ms ease',
          '@keyframes siteFade': { from: { opacity: 0 }, to: { opacity: 1 } },
        }}
      >
        <Box sx={{ width: { md: '55%' }, position: 'relative', aspectRatio: { xs: '16 / 10', md: 'auto' }, minHeight: { md: 380 }, overflow: 'hidden', bgcolor: SITE.stone100 }}>
          {post.coverUrl && <Box component="img" src={post.coverUrl} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        </Box>
        <Stack sx={{ width: { md: '45%' }, p: { xs: 3, lg: 5 }, justifyContent: 'space-between' }}>
          <Box>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ bgcolor: SITE.tint, color: SITE.spruce, px: 1.5, py: 0.5, borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>{t(`news.type.${post.type}`)}</Box>
              <Typography sx={{ color: SITE.neutral500, fontSize: '0.875rem', fontWeight: 500 }}>{meta(post, locale)}</Typography>
            </Stack>
            <Typography component="h3" sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' }, fontWeight: 700, color: SITE.heading, mt: 2.5, mb: 1.5, lineHeight: 1.375 }}>
              {post.title}
            </Typography>
            <Typography sx={{ color: SITE.neutral600, fontSize: '1rem', lineHeight: 1.625 }}>{post.summary}</Typography>
            {post.body && (
              <Button onClick={() => setOpen(post)} sx={{ mt: 2, px: 0, color: SITE.spruce, fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}>
                {t('news.readMore')} →
              </Button>
            )}
          </Box>
          {posts.length > 1 && <Box sx={{ pt: 3, display: { xs: 'none', md: 'block' } }}>{dots}</Box>}
        </Stack>
      </Box>

      {posts.length > 1 && (
        <Stack direction="row" sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
          {prev}
          {dots}
          {next}
        </Stack>
      )}

      <Dialog open={!!open} onClose={() => setOpen(null)} maxWidth="md" fullWidth scroll="body">
        {open && (
          <>
            {open.coverUrl && <Box component="img" src={open.coverUrl} alt="" sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }} />}
            <IconButton onClick={() => setOpen(null)} aria-label={t('news.close')} sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}>
              <CloseRoundedIcon />
            </IconButton>
            <DialogContent sx={{ p: { xs: 3, md: 5 } }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ bgcolor: SITE.tint, color: SITE.spruce, px: 1.5, py: 0.5, borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>{t(`news.type.${open.type}`)}</Box>
                <Typography sx={{ color: SITE.neutral500, fontSize: '0.875rem', fontWeight: 500 }}>{meta(open, locale, true)}</Typography>
              </Stack>
              <Typography component="h2" sx={{ fontSize: { xs: '1.5rem', md: '1.875rem' }, fontWeight: 700, color: SITE.heading, mt: 2, mb: 2, lineHeight: 1.25 }}>
                {open.title}
              </Typography>
              <MarkdownText text={open.body ?? open.summary} sx={{ color: SITE.neutral600, fontSize: '1rem', lineHeight: 1.7 }} />
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
