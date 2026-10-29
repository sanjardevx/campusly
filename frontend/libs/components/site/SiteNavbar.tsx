import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { Box, Button, ButtonBase, Drawer, IconButton, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import { useTranslation } from 'next-i18next/pages';
import { LanguageSwitcher } from '@/libs/components/LanguageSwitcher';
import { DEMO_MODE } from '@/libs/config';
import { EASE, scrollToTop } from './motion';
import { SITE, scrollToId } from './tokens';

export interface NavSection {
  id: string;
  label: string;
}

/** After this much scrolling the bar turns from transparent (over the hero) into glass */
const SOLID_AFTER = 80;
export const NAVBAR_HEIGHT = 76;

/**
 * The public site's top bar (the developer's reference: Thompson International School). Over the
 * hero it is transparent with white text; once the page scrolls it becomes a frosted bar that stays
 * on top, with the section links, the language, the portal and "Enquire". The link of the section
 * on screen is underlined. Below the large breakpoint the links move into a sheet from the bottom.
 */
export function SiteNavbar({ sections }: { sections: NavSection[] }) {
  const { t } = useTranslation('site');
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > SOLID_AFTER);
    const first = requestAnimationFrame(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // The section in the middle band of the screen is the current one
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((el) => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  const go = (id: string) => {
    setMenu(false);
    scrollToId(id);
  };
  const ink = solid ? SITE.ink : '#fff';

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          insetInline: 0,
          zIndex: 1100,
          height: NAVBAR_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          px: { xs: 2, sm: 4, lg: 8 },
          gap: 2,
          color: ink,
          bgcolor: solid ? 'rgba(250,248,244,0.82)' : 'transparent',
          backdropFilter: solid ? 'blur(14px) saturate(1.4)' : 'none',
          borderBottom: '1px solid',
          borderColor: solid ? 'rgba(231,229,228,0.9)' : 'transparent',
          boxShadow: solid ? '0 8px 24px -18px rgba(17,24,39,0.35)' : 'none',
          transition: `background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease, color 300ms ease`,
          '@media (prefers-reduced-transparency: reduce)': { bgcolor: solid ? SITE.canvas : 'transparent', backdropFilter: 'none' },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <ButtonBase onClick={scrollToTop} aria-label={t('nav.home')} sx={{ gap: 1.25, borderRadius: 1, color: 'inherit', flexShrink: 0 }}>
          <SchoolOutlinedIcon sx={{ fontSize: { xs: 26, md: 30 }, color: solid ? SITE.spruce : 'inherit' }} />
          <Typography sx={{ fontSize: { xs: '1.0625rem', md: '1.25rem' }, fontWeight: 700, letterSpacing: '-0.025em', color: 'inherit' }}>Campusly School</Typography>
        </ButtonBase>

        <Stack component="nav" aria-label={t('nav.sections')} direction="row" sx={{ display: { xs: 'none', lg: 'flex' }, flex: 1, justifyContent: 'center', gap: 0.5 }}>
          {sections.map((s) => {
            const on = active === s.id;
            return (
              <ButtonBase
                key={s.id}
                onClick={() => go(s.id)}
                aria-current={on ? 'location' : undefined}
                sx={{
                  position: 'relative',
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'inherit',
                  opacity: on ? 1 : 0.8,
                  transition: 'opacity 200ms ease',
                  '&:hover': { opacity: 1 },
                  // The underline grows from the middle under the current section
                  '&::after': { content: '""', position: 'absolute', left: 12, right: 12, bottom: 2, height: 2, borderRadius: 1, bgcolor: solid ? SITE.spruce : '#fff', transform: on ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 300ms ${EASE}` },
                }}
              >
                {s.label}
              </ButtonBase>
            );
          })}
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'center', gap: { xs: 1, md: 1.5 }, ml: { xs: 'auto', lg: 0 } }}>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <LanguageSwitcher tone={solid ? 'dark' : 'light'} />
          </Box>
          <Button
            component={NextLink}
            href="/login"
            variant="outlined"
            startIcon={<LoginRoundedIcon sx={{ fontSize: 18 }} />}
            sx={{ display: { xs: 'none', md: 'inline-flex' }, borderRadius: '8px', px: 2.25, py: 1, fontSize: '0.875rem', fontWeight: 500, textTransform: 'none', color: 'inherit', borderColor: solid ? SITE.spruce : 'rgba(255,255,255,0.9)', '&:hover': { borderColor: solid ? SITE.spruceHover : '#fff', bgcolor: solid ? SITE.soft : 'rgba(255,255,255,0.1)' } }}
          >
            {t('nav.portal')}
          </Button>
          <Button
            onClick={() => go('enquire')}
            variant="contained"
            disableElevation
            sx={{ borderRadius: '8px', px: { xs: 1.75, md: 2.5 }, py: 1, fontSize: '0.875rem', fontWeight: 700, textTransform: 'none', bgcolor: solid ? SITE.spruce : '#fff', color: solid ? '#fff' : SITE.spruce, '&:hover': { bgcolor: solid ? SITE.spruceHover : '#F5F5F5' } }}
          >
            <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
              {t('nav.enquire')}
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
              {t('nav.enquireShort')}
            </Box>
          </Button>
          <IconButton onClick={() => setMenu(true)} aria-label={t('nav.menu')} aria-expanded={menu} sx={{ display: { lg: 'none' }, color: 'inherit', border: '1px solid', borderColor: solid ? SITE.stone200 : 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
            <MenuRoundedIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Phones and tablets: the section links in a sheet from the bottom */}
      <Drawer anchor="bottom" open={menu} onClose={() => setMenu(false)} slotProps={{ paper: { sx: { borderRadius: '20px 20px 0 0', bgcolor: SITE.canvas, px: 2.5, pt: 1.5, pb: 3 } } }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: SITE.stone200, mx: 'auto', mb: 1.5 }} />
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography sx={{ fontWeight: 700, color: SITE.ink }}>Campusly School</Typography>
          <IconButton onClick={() => setMenu(false)} aria-label={t('nav.close')}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
        <Stack component="nav" aria-label={t('nav.sections')}>
          {sections.map((s) => (
            <ButtonBase key={s.id} onClick={() => go(s.id)} aria-current={active === s.id ? 'location' : undefined} sx={{ justifyContent: 'space-between', py: 1.5, px: 1, borderRadius: 2, fontSize: '1.0625rem', fontWeight: active === s.id ? 700 : 500, color: active === s.id ? SITE.spruce : SITE.ink, borderBottom: `1px solid ${SITE.stone100}` }}>
              {s.label}
              <span aria-hidden>→</span>
            </ButtonBase>
          ))}
        </Stack>
        <Stack sx={{ gap: 1.25, mt: 2.5 }}>
          <Box sx={{ alignSelf: 'flex-start' }}>
            <LanguageSwitcher />
          </Box>
          <Button component={NextLink} href="/login" variant="outlined" startIcon={<LoginRoundedIcon />} sx={{ borderRadius: '10px', py: 1.25, textTransform: 'none', fontWeight: 600, color: SITE.spruce, borderColor: SITE.spruce }}>
            {t('nav.portal')}
          </Button>
          {DEMO_MODE && (
            <Button component={NextLink} href="/login#demo" variant="outlined" startIcon={<PlayCircleOutlineRoundedIcon />} sx={{ borderRadius: '10px', py: 1.25, textTransform: 'none', fontWeight: 600, color: SITE.spruce, borderColor: SITE.spruce }}>
              {t('nav.liveDemo')}
            </Button>
          )}
          <Button onClick={() => go('enquire')} variant="contained" disableElevation sx={{ borderRadius: '10px', py: 1.25, textTransform: 'none', fontWeight: 700, bgcolor: SITE.spruce, '&:hover': { bgcolor: SITE.spruceHover } }}>
            {t('nav.enquire')}
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}
