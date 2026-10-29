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
import { SITE, type SiteData, containerSx } from './tokens';

const headSx = { fontSize: '0.875rem', fontWeight: 600, color: '#111827', mb: 2, letterSpacing: '0.025em', textTransform: 'uppercase' } as const;

function Social({ href, icon, label }: { href: string | null | undefined; icon: ReactNode; label: string }) {
  const tile = (
    <Box className="tile" sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: SITE.stone100, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 150ms ease', '& svg': { fontSize: 16 } }}>
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
    <Link href={href} target="_blank" rel="noopener noreferrer" underline="none" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, fontSize: '0.875rem', color: SITE.stone600, '&:hover': { color: SITE.spruce, '& .tile': { bgcolor: SITE.tint } } }}>
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
    <Box component="footer" sx={{ bgcolor: '#fff', borderTop: `1px solid ${SITE.stone200}`, pt: 8, pb: 6 }}>
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
                <DirectionsSubwayOutlinedIcon sx={{ fontSize: 16, color: SITE.spruce }} />
                {contact.metro}
              </Stack>
            )}
            {contact.phone && (
              <Stack component="a" href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} direction="row" sx={{ alignItems: 'center', gap: 0.75, fontSize: '0.875rem', fontWeight: 600, color: '#111827', mb: 0.5, textDecoration: 'none' }}>
                <CallOutlinedIcon sx={{ fontSize: 16, color: SITE.stone500 }} />
                {contact.phone}
              </Stack>
            )}
            {contact.email && (
              <Link href={`mailto:${contact.email}`} underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: '0.875rem', fontWeight: 500, color: SITE.spruce }}>
                <MailOutlineRoundedIcon sx={{ fontSize: 16 }} />
                {contact.email}
              </Link>
            )}
          </Box>
          <Box>
            <Typography component="h3" sx={headSx}>
              {t('footer.followUs')}
            </Typography>
            <Stack sx={{ gap: 1.5, alignItems: 'flex-start' }}>
              <Social href={contact.telegramUrl} icon={<TelegramIcon />} label={t('footer.telegram')} />
              <Social href={contact.instagramUrl} icon={<InstagramIcon />} label={t('footer.instagram')} />
              <Social href={contact.youtubeUrl} icon={<YouTubeIcon />} label={t('footer.youtube')} />
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
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ borderTop: `1px solid ${SITE.stone100}`, mt: 6, pt: 4, justifyContent: 'space-between', alignItems: 'center', gap: 2, fontSize: '0.75rem', color: SITE.stone500 }}>
          <span>{t('footer.rights', { year: new Date().getFullYear(), school: contact.schoolName })}</span>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
            {/* The site is in four languages; on phones the top bar has no room for the switcher */}
            <LanguageSwitcher />
            <span>{t('footer.city')}</span>
          </Stack>
        </Stack>
        {/* The one disclaimer (DECISIONS §12): every person and record in Campusly is invented */}
        <Typography sx={{ mt: 2, fontSize: '0.75rem', color: SITE.stone500, textAlign: { xs: 'center', sm: 'left' } }}>
          {t('footer.fictional')}
        </Typography>
      </Box>
    </Box>
  );
}
