import { useEffect, useState, useSyncExternalStore } from 'react';
import NextLink from 'next/link';
import { Box, Button, ButtonBase, IconButton, Stack, Typography, useMediaQuery } from '@mui/material';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { useTranslation } from 'next-i18next/pages';
import { useReducedMotion } from '@/libs/components/dashboard/motion';
import { CountUp, Typewriter } from './motion';
import { SITE, type SiteData, containerSx, scrollToId } from './tokens';

/** Hero photos (Stitch placeholders until the school's own; frontend/public/site) */
const SLIDES = ['/site/hero-campus.jpg', '/site/hero-open-day.jpg', '/site/stage-high.jpg', '/site/stage-middle.jpg'];
const SLIDE_MS = 4500;
/** Phones show the first two photos only (less to download on mobile data) */
const PHONE_SLIDES = 2;
const noop = () => () => {};

const outlineBtn = {
  borderRadius: '8px',
  border: '1px solid #fff',
  color: '#fff',
  fontWeight: 500,
  textTransform: 'none',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: '#fff' },
} as const;
const solidBtn = {
  borderRadius: '8px',
  bgcolor: '#fff',
  color: SITE.spruce,
  fontWeight: 700,
  textTransform: 'none',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  '&:hover': { bgcolor: '#F5F5F5' },
} as const;

/**
 * Stitch "Landing Page (Part A)": the full-bleed hero (photo slideshow under a spruce scrim, the
 * transparent top bar, the pill, the headline and two buttons, dots + pause) and the numbers card
 * that overlaps its bottom edge. Phones (Part A Mobile): compact "Sign in" / "Enquire" in the bar
 * and the two hero buttons stacked full width.
 *
 * Only the first photo is in the first HTML; the others are added after the page loads (two on a
 * phone, all four on wider screens), so they never hold up the first paint.
 */
export function SiteHero({ stats }: { stats: SiteData['stats'] }) {
  const { t } = useTranslation('site');
  const reduced = useReducedMotion();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  // false on the server and the first render (same HTML), the real value right after
  const phone = useMediaQuery('(max-width: 599.95px)');
  // false in the server HTML and while hydrating, true right after: the extra photos come later
  const loaded = useSyncExternalStore(noop, () => true, () => false);
  const count = phone ? PHONE_SLIDES : SLIDES.length;
  const current = slide % count;

  // Reduced motion: no automatic slides (the dots still work)
  useEffect(() => {
    if (paused || reduced) return;
    const timer = window.setInterval(() => setSlide((s) => (s + 1) % count), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduced, count]);

  const numbers = [
    { value: stats.students, label: t('stats.students') },
    { value: stats.teachers, label: t('stats.teachers') },
    { value: stats.programs, label: t('stats.programs') },
    // A year is not a count: it is shown as it is
    ...(stats.founded ? [{ value: stats.founded, label: t('stats.founded'), year: true }] : []),
  ];

  return (
    <>
      <Box component="section" sx={{ position: 'relative', minHeight: { xs: '90vh', md: '85vh' }, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {SLIDES.slice(0, loaded ? count : 1).map((src, i) => (
          <Box
            key={src}
            component="img"
            src={src}
            alt=""
            aria-hidden
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', opacity: i === current ? 1 : 0, transition: reduced ? 'none' : 'opacity 1200ms ease' }}
          />
        ))}
        {/* Green scrim, strongest on the left where the text is */}
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: { xs: 'linear-gradient(to top, rgba(47,122,99,0.9), rgba(47,122,99,0.68) 55%, rgba(47,122,99,0.25))', md: 'linear-gradient(to right, rgba(47,122,99,0.9), rgba(47,122,99,0.75) 50%, transparent)' } }} />

        {/* Hero text */}
        <Box sx={{ position: 'relative', zIndex: 2, maxWidth: 672, pt: { xs: 18, lg: 20 }, pb: { xs: 3, md: 14 }, px: { xs: 2, sm: 4, lg: 8 }, mt: { xs: 'auto', md: 0 } }}>
          <Box sx={{ display: 'inline-flex', px: 1.75, py: 0.75, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.025em', textTransform: 'uppercase', mb: 3 }}>
            {t('hero.pill')}
          </Box>
          <Typography component="h1" sx={{ color: '#fff', fontSize: { xs: '2.25rem', sm: '3rem', lg: '54px' }, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15, mb: 2.5 }}>
            <Typewriter text={t('hero.title')} />
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: { xs: '1.125rem', lg: '1.25rem' }, lineHeight: 1.625, mb: 4, maxWidth: 576 }}>{t('hero.subtitle')}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
            <Button onClick={() => scrollToId('enquire')} variant="contained" disableElevation sx={{ ...solidBtn, px: 3.5, py: 1.5, fontSize: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              {t('nav.enquire')}
            </Button>
            <Button component={NextLink} href="/portal" variant="outlined" sx={{ ...outlineBtn, px: 3, py: 1.5, fontSize: '1rem' }}>
              {t('nav.portal')} →
            </Button>
          </Stack>
        </Box>

        {/* Slide dots + pause */}
        <Stack direction="row" sx={{ position: 'relative', zIndex: 2, px: { xs: 2, sm: 4, lg: 8 }, pb: { xs: 10, md: 10 }, alignItems: 'center', gap: 1 }}>
          {SLIDES.slice(0, count).map((src, i) => (
            <ButtonBase key={src} onClick={() => setSlide(i)} aria-label={t('hero.slide', { n: i + 1 })} aria-current={i === current} sx={{ width: i === current ? 24 : 8, height: 8, borderRadius: 999, bgcolor: i === current ? '#fff' : 'rgba(255,255,255,0.4)', transition: reduced ? 'none' : 'width 300ms ease, background-color 300ms ease' }} />
          ))}
          <IconButton onClick={() => setPaused((p) => !p)} aria-label={paused ? t('hero.play') : t('hero.pause')} sx={{ ml: 1, width: 28, height: 28, border: '1px solid rgba(255,255,255,0.4)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}>
            {paused ? <PlayArrowRoundedIcon sx={{ fontSize: 16 }} /> : <PauseRoundedIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Stack>
      </Box>

      {/* Numbers card overlapping the hero */}
      <Box component="section" sx={{ position: 'relative', zIndex: 3, ...containerSx, mt: -7, mb: 4 }}>
        <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: { xs: 2, md: 4 }, border: `1px solid ${SITE.stone100}`, boxShadow: SITE.statShadow, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: `repeat(${numbers.length}, 1fr)` } }}>
          {numbers.map((n, i) => (
            <Stack key={n.label} direction="row" sx={{ alignItems: 'baseline', gap: 1, p: { xs: 2, md: 0 }, px: { md: 3 }, py: { md: 1 }, borderLeft: { md: i ? `1px solid ${SITE.stone200}` : 0 }, borderTop: { xs: i >= 2 ? `1px solid ${SITE.stone200}` : 0, md: 0 } }}>
              <Typography sx={{ fontSize: { xs: '2rem', lg: '40px' }, fontWeight: 700, color: SITE.spruce, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
                {'year' in n ? n.value : <CountUp value={n.value} />}
              </Typography>
              <Typography sx={{ color: SITE.neutral500, fontWeight: 500, fontSize: '1rem' }}>· {n.label}</Typography>
            </Stack>
          ))}
        </Box>
      </Box>
    </>
  );
}
