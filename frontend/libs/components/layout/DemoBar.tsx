import { useState } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient } from '@apollo/client/react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Stack,
  Typography,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import { useTranslation } from 'next-i18next/pages';
import { logOut } from '@/libs/auth';
import type { SessionUser } from '@/libs/auth/api';
import { DEMO_ENTRIES, demoOf, useOpenDemo } from '@/libs/auth/demo';
import { whileSigningOut } from '@/libs/auth/navigation';

const TIPS = ['t1', 't2', 't3', 't4'];

/**
 * Inside the portal for demo accounts only (DECISIONS §12, demo v2): who you are, "what to try"
 * for this role, and a switch to the other demo doors without going back to the sign-in page.
 */
export function DemoBar({ user }: { user: SessionUser }) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const client = useApolloClient();
  const { open, busy, error } = useOpenDemo();
  const [tipsAt, setTipsAt] = useState<HTMLElement | null>(null);
  const [switchAt, setSwitchAt] = useState<HTMLElement | null>(null);

  const current = demoOf(user);
  if (!user.isDemo || !current) return null;
  const who = t(`demo.entry.${current.key}.name`);

  const exit = async () => {
    setSwitchAt(null);
    await whileSigningOut(async () => {
      await logOut(client);
      await router.replace('/');
    });
  };

  return (
    <Box
      role="region"
      aria-label={t('demo.bar.label')}
      sx={{ border: '1px solid', borderColor: 'rgba(31,78,67,0.18)', bgcolor: 'primary.light', borderRadius: 2, px: 1.5, py: 1 }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.25, borderRadius: 999, bgcolor: 'primary.main', color: '#fff', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#7BD3A8' }} />
          {t('demo.bar.label')}
        </Box>
        <Typography sx={{ fontSize: '0.8125rem', color: 'primary.main', fontWeight: 600, minWidth: 0 }}>
          {t('demo.bar.as', { who })}
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, fontWeight: 400, color: 'text.secondary' }}>
            {' · '}
            {t('demo.bar.reset')}
          </Box>
        </Typography>

        <Stack direction="row" sx={{ ml: 'auto', gap: 0.5 }}>
          <Button size="small" startIcon={<LightbulbOutlinedIcon />} onClick={(e) => setTipsAt(e.currentTarget)} aria-expanded={!!tipsAt} sx={{ textTransform: 'none', fontWeight: 600 }}>
            {t('demo.bar.try')}
          </Button>
          <Button
            size="small"
            startIcon={busy ? <CircularProgress size={14} /> : <SwapHorizRoundedIcon />}
            endIcon={<ExpandMoreRoundedIcon />}
            disabled={busy !== null}
            onClick={(e) => setSwitchAt(e.currentTarget)}
            aria-haspopup="menu"
            aria-expanded={!!switchAt}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('demo.bar.switch')}
          </Button>
        </Stack>
      </Stack>

      {error && <Typography sx={{ mt: 0.75, fontSize: '0.8125rem', color: 'error.main' }}>{error}</Typography>}

      <Popover
        open={!!tipsAt}
        anchorEl={tipsAt}
        onClose={() => setTipsAt(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 0.5, p: 2, maxWidth: 340, borderRadius: 2 } } }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1 }}>{t('demo.bar.try')}</Typography>
        <Box component="ol" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 0.75 }}>
          {TIPS.map((tip) => (
            <Typography key={tip} component="li" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
              {t(`demo.try.${current.role}.${tip}`)}
            </Typography>
          ))}
        </Box>
      </Popover>

      <Menu
        open={!!switchAt}
        anchorEl={switchAt}
        onClose={() => setSwitchAt(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {DEMO_ENTRIES.map((entry) => (
          <MenuItem
            key={entry.key}
            selected={entry.key === current.key}
            disabled={entry.key === current.key}
            onClick={() => {
              setSwitchAt(null);
              void open(entry, { switching: true });
            }}
          >
            <ListItemIcon>{entry.key === current.key && <CheckRoundedIcon fontSize="small" />}</ListItemIcon>
            <ListItemText primary={t(`demo.entry.${entry.key}.name`)} secondary={t(`demo.entry.${entry.key}.text`)} />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => void exit()}>
          <ListItemIcon>
            <LogoutOutlinedIcon fontSize="small" />
          </ListItemIcon>
          {t('demo.bar.exit')}
        </MenuItem>
      </Menu>
    </Box>
  );
}
