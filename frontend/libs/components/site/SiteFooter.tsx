import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { Box, Link, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import DirectionsSubwayOutlinedIcon from '@mui/icons-material/DirectionsSubwayOutlined';
import InstagramIcon from '@mui/icons-material/Instagram';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import TelegramIcon from '@mui/icons-material/Telegram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { useTranslation } from 'next-i18next/pages';
import { LanguageSwitcher } from '@/libs/components/LanguageSwitcher';
import { DEMO_MODE } from '@/libs/config';
import { phonesOf, telHref } from '@/libs/phones';
import { SITE, SITE_TONES, type SiteData, containerSx } from './tokens';

const headSx = { fontSize: '0.875rem', fontWeight: 600, color: '#111827', mb: 2, letterSpacing: '0.025em', textTransform: 'uppercase' } as const;

/**
 * Brand colours, footer only: the glyph in the brand colour on its soft tint, the tile filled with
 * the brand (Instagram: its gradient) and a white glyph on hover. Logos, so the label beside each
 * one carries the meaning.
 */
const BRANDS = {
  telegram: { color: '#26A5E4', tint: '#E6F5FC', fill: '#26A5E4' },
  instagram: { color: '#E4405F', tint: '#FDEBEF', fill: 'linear-gradient(45deg, #F58529, #DD2A7B 50%, #8134AF)' },
  youtube: { color: '#FF0000', tint: '#FFE9E9', fill: '#FF0000' },
} as const;

function Social({ href, brand, icon, label }: { href: string | null | undefined; brand: keyof typeof BRANDS; icon: ReactNode; label: string }) {
  const b = BRANDS[brand];
  const tile = (
    <Box className="tile" sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: b.tint, color: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 150ms ease, color 150ms ease', '& svg': { fontSize: 18 } }}>
      {icon}
    </Box>
  );
  // No link set in Settings: shown, not clickable
  if (!href) {
    return (
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, fontSize: '0.875rem', color: SITE.stone400 }}>
        {tile}
        {label}
      </Stack>
    );
  }
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" underline="none" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, fontSize: '0.875rem', color: SITE.stone600, '&:hover': { color: SITE.ink, '& .tile': { background: b.fill, color: '#fff' } } }}>
      {tile}
      {label}
    </Link>
  );
}

function PortalLink({ href, label }: { href: string; label: string }) {
  return (
    <Link component={NextLink} href={href} underline="none" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: '12px', border: `1px solid ${SITE.stone200}`, bgcolor: 'rgba(250,250,249,0.5)', color: '#111827', fontSize: '0.875rem', fontWeight: 500, transition: 'border-color 150ms ease, background-color 150ms ease, color 150ms ease', '& svg': { color: SITE.stone400, fontSize: 18, transition: 'transform 150ms ease, color 150ms ease' }, '&:hover': { borderColor: SITE.spruce, bgcolor: 'rgba(232,239,234,0.4)', color: SITE.spruce, '& svg': { color: SITE.spruce, transform: 'translateX(2px)' } } }}>
      {label}
      <ArrowForwardRoundedIcon />
    </Link>
  );
}

/** Stitch Part C footer: school and contact, "Follow us", "Portals", copyright line */
export function SiteFooter({ contact }: { contact: SiteData['contact'] }) {
  const { t } = useTranslation('site');
  return (
    <Box component="footer" sx={{ bgcolor: '#fff', borderTop: `1px solid ${SITE.stone200}`, pt: 8, pb: 4 }}>
      <Box sx={containerSx}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 5, lg: 8 } }}>
          <Box>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 2 }}>
              <SchoolOutlinedIcon sx={{ color: SITE.spruce }} />
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.025em' }}>{contact.schoolName}</Typography>
            </Stack>
            {contact.address && <Typography sx={{ fontSize: '0.875rem', color: SITE.stone600, mb: 0.5, lineHeight: 1.625 }}>{contact.address}</Typography>}
            {contact.metro && (
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, fontSize: '0.875rem', color: SITE.stone500, mb: 1.5 }}>
                <DirectionsSubwayOutlinedIcon sx={{ fontSize: 16, color: SITE_TONES.blue.to }} />
                {contact.metro}
              </Stack>
            )}
            {phonesOf(contact.phone).map((phone) => (
              <Stack key={phone} component="a" href={telHref(phone)} direction="row" sx={{ alignItems: 'center', gap: 0.75, fontSize: '0.875rem', fontWeight: 600, color: '#111827', mb: 0.5, textDecoration: 'none' }}>
                <CallOutlinedIcon sx={{ fontSize: 16, color: SITE.spruce }} />
                {phone}
              </Stack>
            ))}
            {contact.email && (
              <Link href={`mailto:${contact.email}`} underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: '0.875rem', fontWeight: 500, color: SITE.spruce }}>
                <MailOutlineRoundedIcon sx={{ fontSize: 16, color: SITE_TONES.orange.to }} />
                {contact.email}
              </Link>
            )}
          </Box>
          <Box>
            <Typography component="h3" sx={headSx}>
              {t('footer.followUs')}
            </Typography>
            <Stack sx={{ gap: 1.5, alignItems: 'flex-start' }}>
              <Social href={contact.telegramUrl} brand="telegram" icon={<TelegramIcon />} label={t('footer.telegram')} />
              <Social href={contact.instagramUrl} brand="instagram" icon={<InstagramIcon />} label={t('footer.instagram')} />
              <Social href={contact.youtubeUrl} brand="youtube" icon={<YouTubeIcon />} label={t('footer.youtube')} />
            </Stack>
          </Box>
          <Box>
            <Typography component="h3" sx={headSx}>
              {t('footer.portals')}
            </Typography>
            <Stack sx={{ gap: 1.5 }}>
              <PortalLink href="/login" label={t('footer.studentSignIn')} />
              <PortalLink href="/login/teacher" label={t('footer.teacherSignIn')} />
              {DEMO_MODE && <PortalLink href="/login#demo" label={t('nav.liveDemo')} />}
            </Stack>
          </Box>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ borderTop: `1px solid ${SITE.stone100}`, mt: 5, pt: 3, justifyContent: 'space-between', alignItems: 'center', gap: 2, fontSize: '0.75rem', color: SITE.stone500 }}>
          {/* The copyright and, right under it, the one disclaimer (DECISIONS §12): everyone here is invented */}
          <Stack sx={{ gap: 0.5, textAlign: { xs: 'center', sm: 'left' } }}>
            <span>{t('footer.rights', { year: new Date().getFullYear(), school: contact.schoolName })}</span>
            <span>{t('footer.fictional')}</span>
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
            {/* The site is in four languages; on phones the top bar has no room for the switcher */}
            <LanguageSwitcher />
            <span>{t('footer.city')}</span>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
