import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, ButtonBase, Dialog, DialogContent, IconButton, Stack, Typography } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
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

/** Autoplay: the next post every 4 s. The active dot's fill IS the clock (it ends → next post), so
 *  pausing it pauses the timer exactly where it was. */
const AUTOPLAY_MS = 4000;
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** A swipe counts past this distance, or as a quick flick (px per ms) */
const SWIPE_PX = 60;
const FLICK = 0.11;

/** "Oct 24, 2026 · Main Hall · 10:00" (the dialog shows the end time too: "10:00–13:00") */
function meta(post: Post, locale: string, withEnd = false) {
  const time = withEnd && post.startTime && post.endTime ? `${post.startTime}–${post.endTime}` : post.startTime;
  return [siteDate(post.date, locale), post.place, time].filter(Boolean).join(' · ');
}

/**
 * Stitch "Landing Page (Part A)" → News & Events: one large card at a time (photo 55 %, text 45 %),
 * round prev / next buttons by the title, dots under the text. Phones: photo on top, the arrows
 * and dots under the card. A post with full text opens it in a dialog ("Read more").
 * The card follows a finger or the mouse (swipe / drag) and moves on by itself every 4 s; it waits
 * while hovered, focused, touched, off-screen, behind the dialog or paused, and never moves by
 * itself with reduced motion.
 */
export function SiteNews({ posts }: { posts: Post[] }) {
  const { t } = useTranslation('site');
  const { locale = 'en', query } = useRouter();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  // Which way the last change went: the new card slides in from that side
  const [dir, setDir] = useState<1 | -1>(1);
  // ?post=<id> (the CMS's "View on site") opens that post
  const [open, setOpen] = useState<Post | null>(() => posts.find((p) => p.id === query.post) ?? null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [dx, setDx] = useState(0);
  const section = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; y: number; t: number; moving: boolean } | null>(null);
  const moved = useRef(false);

  // Off-screen: no autoplay (and nothing changes while the visitor reads another section)
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
  const go = (step: 1 | -1) => {
    setDir(step);
    setIndex((i) => (i + step + posts.length) % posts.length);
  };
  const autoplay = posts.length > 1 && !reduced;
  const running = autoplay && !paused && !hovered && !focused && !touching && onScreen && !open;

  // Swipe / drag: horizontal moves only (a vertical one scrolls the page), past 60 px or a flick
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (posts.length < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), moving: false };
    moved.current = false;
    setTouching(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    if (!d.moving) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) return end();
      if (Math.abs(mx) < 8) return;
      d.moving = true;
      moved.current = true;
      // Keeps the drag when the pointer leaves the card; a pointer already gone cannot be captured
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* the drag still works inside the card */
      }
    }
    setDx(mx);
  };
  const end = () => {
    const d = drag.current;
    drag.current = null;
    setTouching(false);
    if (!d?.moving) return;
    const speed = Math.abs(dx) / Math.max(1, performance.now() - d.t);
    if (Math.abs(dx) > SWIPE_PX || speed > FLICK) go(dx < 0 ? 1 : -1);
    setDx(0);
  };
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
  // The active dot is a pill that fills in 4 s; when the fill ends, the next post comes
  const dots = (
    <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
      {posts.map((p, i) => {
        const active = i === index;
        return (
          <ButtonBase
            key={p.id}
            onClick={() => {
              setDir(i > index ? 1 : -1);
              setIndex(i);
            }}
            aria-label={t('news.goTo', { n: i + 1 })}
            aria-current={active}
            sx={{ position: 'relative', overflow: 'hidden', width: active ? 28 : 10, height: 10, borderRadius: 999, bgcolor: active && !autoplay ? SITE.spruce : SITE.neutral300, transition: `width 300ms ${EASE_OUT}` }}
          >
            {active && autoplay && (
              <Box
                key={index}
                aria-hidden
                onAnimationEnd={() => go(1)}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: SITE.spruce,
                  transformOrigin: 'left',
                  animation: `newsClock ${AUTOPLAY_MS}ms linear both`,
                  animationPlayState: running ? 'running' : 'paused',
                  '@keyframes newsClock': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
                }}
              />
            )}
          </ButtonBase>
        );
      })}
      {autoplay && (
        <IconButton size="small" onClick={() => setPaused((v) => !v)} aria-label={paused ? t('hero.play') : t('hero.pause')} sx={{ ml: 0.5, color: SITE.neutral500 }}>
          {paused ? <PlayArrowRoundedIcon fontSize="small" /> : <PauseRoundedIcon fontSize="small" />}
        </IconButton>
      )}
    </Stack>
  );

  return (
    <Box
      ref={section}
      component="section"
      id="news"
      aria-roledescription="carousel"
      // Keyboard focus pauses it (a mouse click on the arrows does not)
      onFocus={(e) => setFocused(e.target.matches(':focus-visible'))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      sx={{ ...containerSx, pt: { xs: 8, md: 10 }, pb: 8 }}
    >
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
        aria-roledescription="slide"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        // Hover only with a real mouse (a tap must not pause it for good)
        onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        // A drag is not a click on "Read more"
        onClickCapture={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
        sx={{
          // Vertical scrolling stays the browser's; horizontal moves are the swipe
          touchAction: 'pan-y',
          userSelect: dx ? 'none' : 'auto',
          cursor: posts.length > 1 ? (dx ? 'grabbing' : 'grab') : 'auto',
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dx ? 'none' : `transform 300ms ${EASE_OUT}`,
          borderRadius: '16px',
          overflow: 'hidden',
          bgcolor: '#fff',
          border: '1px solid rgba(229,229,229,0.8)',
          boxShadow: SITE.cardShadow,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          minHeight: { md: 380 },
          // The new card comes in from the side it was swiped (or stepped) towards
          animation: reduced ? 'none' : `${dir > 0 ? 'newsInRight' : 'newsInLeft'} 380ms ${EASE_OUT}`,
          '@keyframes newsInRight': { from: { opacity: 0, transform: 'translateX(32px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
          '@keyframes newsInLeft': { from: { opacity: 0, transform: 'translateX(-32px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        }}
      >
        <Box sx={{ width: { md: '55%' }, position: 'relative', aspectRatio: { xs: '16 / 10', md: 'auto' }, minHeight: { md: 380 }, overflow: 'hidden', bgcolor: SITE.stone100 }}>
          {post.coverUrl && <Box component="img" src={post.coverUrl} alt="" draggable={false} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />}
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
