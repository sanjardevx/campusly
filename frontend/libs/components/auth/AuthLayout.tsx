import type { ReactNode } from 'react';
import Head from 'next/head';
import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { useTranslation } from 'next-i18next/pages';
import { LanguageSwitcher } from '@/libs/components/LanguageSwitcher';
import { Logo } from '@/libs/components/Logo';

interface Props {
  /** Which left panel: students & parents, or the teacher portal */
  portal: 'student' | 'teacher';
  /** Less vertical space around the form (long forms such as "Set a new password") */
  dense?: boolean;
  features: { icon: ReactNode; text: string }[];
  title: string;
  children: ReactNode;
}

/**
 * Stitch "Student & Parent Sign In" / "Teacher Portal Sign in": a spruce panel (45 %) with the
 * value proposition, the form on white (max 400 px). On phones the panel shrinks to a header.
 */
export function AuthLayout({ portal, features, title, children, dense = false }: Props) {
  const { t } = useTranslation('auth');

  return (
    <>
      <Head>
        <title>{`${title} · Campusly`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
        <Box
          component="aside"
          sx={{
            width: { xs: '100%', md: '45%' },
            bgcolor: 'primary.main',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            // Phones (Stitch mobile): a compact 175 px header, 16 px side margins
            px: { xs: 2, md: 7 },
            pt: { xs: 2.5, md: 7 },
            pb: { xs: 3, md: 7 },
            minHeight: { xs: 175, md: '100vh' },
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Logo tone="light" size={{ xs: 17, md: 18 }} />
            {portal === 'teacher' && (
              <Chip
                label={t('portal.teacher.badge')}
                size="small"
                variant="outlined"
                sx={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.35)', borderRadius: 1 }}
              />
            )}
          </Stack>
            {/* Phones: the language menu sits in the header, as in the Stitch mobile screen */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <LanguageSwitcher tone="light" />
            </Box>
          </Stack>

          <Box sx={{ mt: { xs: 2, md: 'auto' }, mb: { md: 'auto' }, py: { md: 6 }, maxWidth: 440 }}>
            <Typography
              component="p"
              sx={{
                fontSize: { xs: '1.5rem', md: '2.25rem' },
                fontWeight: { xs: 600, md: 700 },
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
                mb: { xs: 0, md: 1.5 },
              }}
            >
              {t(`portal.${portal}.headline`)}
            </Typography>
            {/* On phones only the headline: the form must stay above the fold */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', mb: 4 }}>
                {t(`portal.${portal}.subtitle`)}
              </Typography>
              <Stack spacing={2}>
                {features.map((f) => (
                  <Stack key={f.text} direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {f.icon}
                    </Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                      {f.text}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Box>

          {/* A quiet proverb above the footer (desktop only: phones keep the form above the fold).
              No author on purpose: it is often credited to Franklin, but no source supports that. */}
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ display: { xs: 'none', md: 'flex' }, mb: 3, maxWidth: 440, alignItems: 'flex-start' }}
          >
            <FormatQuoteIcon sx={{ fontSize: 28, color: 'rgba(255,255,255,0.35)', transform: 'scaleX(-1)', mt: '-2px' }} />
            <Typography
              component="blockquote"
              sx={{ m: 0, fontSize: '1rem', fontStyle: 'italic', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}
            >
              {t('portal.quote')}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            sx={{
              display: { xs: 'none', md: 'flex' },
              pt: 3,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              justifyContent: 'space-between',
              gap: 2,
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <span>{t('portal.footer', { year: new Date().getFullYear() })}</span>
            <SiteLink color="rgba(255,255,255,0.85)" />
          </Stack>
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 2, md: dense ? 6 : 7 },
            pt: { xs: 3, md: dense ? 2 : 7 },
            pb: { xs: 0, md: dense ? 2 : 7 },
          }}
        >
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end' }}>
            <LanguageSwitcher />
          </Box>
          <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto', my: { md: 'auto' }, py: { xs: 0, md: dense ? 1 : 4 } }}>
            {children}
          </Box>
          {/* Phones: the small footer of the Stitch mobile screen */}
          <Stack
            sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.75, py: 3, mt: 'auto', fontSize: '0.75rem', color: '#707975' }}
          >
            <SiteLink color="primary.main" />
            <span>{t('portal.footer', { year: new Date().getFullYear() })}</span>
          </Stack>
        </Box>
      </Box>
    </>
  );
}

/** "School website ↗": the public site in a new tab (the shells have the same link) */
function SiteLink({ color }: { color: string }) {
  const { t } = useTranslation('common');
  return (
    <Link href="/" target="_blank" rel="noopener" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', fontWeight: 600, color }}>
      {t('shell.viewPublicSite')}
      <NorthEastIcon sx={{ fontSize: 14 }} />
    </Link>
  );
}
