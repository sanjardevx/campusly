import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client/react';
import { Alert, Box, ButtonBase, CircularProgress, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import CoPresentOutlinedIcon from '@mui/icons-material/CoPresentOutlined';
import FamilyRestroomOutlinedIcon from '@mui/icons-material/FamilyRestroomOutlined';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import { useTranslation } from 'next-i18next/pages';
import { sessionReadyVar, userVar } from '@/apollo/store';
import { DEMO_ENTRIES, type DemoKey, demoFromQuery, useOpenDemo } from '@/libs/auth/demo';
import { pressSx } from '@/libs/components/student/home/parts';

const ICONS: Record<DemoKey, SvgIconComponent> = {
  student9a: SchoolOutlinedIcon,
  student11a: SchoolOutlinedIcon,
  parent: FamilyRestroomOutlinedIcon,
  teacher: CoPresentOutlinedIcon,
};

/**
 * "Live demo" under the sign-in form (demo server only): four doors, no password.
 * /login?demo=<key> opens one at once (links from a CV or the public site); /login#demo scrolls here.
 */
export function LiveDemo() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { open, busy, error } = useOpenDemo();
  const ready = useReactiveVar(sessionReadyVar);
  const opened = useRef(false);

  useEffect(() => {
    if (!router.isReady || !ready || opened.current) return;
    const entry = demoFromQuery(router.query.demo);
    if (!entry) return;
    opened.current = true;
    // Someone already signed in (another demo role, say): that session is signed out first
    void open(entry, { switching: !!userVar() });
  }, [router.isReady, ready, router.query.demo, open]);

  return (
    <Box id="demo" sx={{ mt: { xs: 3, md: 4 }, scrollMarginTop: 16 }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, mb: 2, color: 'text.secondary', fontSize: '0.75rem' }}>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
        {t('demo.or')}
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
      </Stack>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, bgcolor: '#FAFAF8' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <PlayCircleOutlineRoundedIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            {t('demo.title')}
          </Typography>
        </Stack>
        <Typography sx={{ mt: 0.5, fontSize: '0.8125rem', color: 'text.secondary' }}>{t('demo.subtitle')}</Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 1.5, display: 'grid', gap: 1, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {DEMO_ENTRIES.map((entry) => {
            const Icon = ICONS[entry.key];
            const loading = busy === entry.key;
            return (
              <ButtonBase
                key={entry.key}
                disabled={busy !== null}
                onClick={() => void open(entry)}
                aria-busy={loading}
                sx={{
                  ...pressSx,
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  gap: 1,
                  p: 1.25,
                  minHeight: 64,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  '&:hover': { borderColor: 'primary.main' },
                  '&.Mui-disabled': { opacity: loading ? 1 : 0.55 },
                  '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                }}
              >
                <Box sx={{ width: 28, height: 28, flexShrink: 0, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.main' }}>
                  {loading ? <CircularProgress size={14} /> : <Icon sx={{ fontSize: 17 }} />}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.3 }}>
                    {t(`demo.entry.${entry.key}.name`)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.35 }}>
                    {loading ? t('demo.opening') : t(`demo.entry.${entry.key}.text`)}
                  </Typography>
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
        <Typography sx={{ mt: 1.5, fontSize: '0.75rem', color: 'text.secondary' }}>{t('demo.note')}</Typography>
      </Box>
    </Box>
  );
}
