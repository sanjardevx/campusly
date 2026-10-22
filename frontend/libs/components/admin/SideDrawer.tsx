import type { ReactNode } from 'react';
import { Box, Drawer, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Stitch's right-side form drawer (520 px): fixed header, scrolling body, fixed footer with the
 * buttons. The page stays visible behind it, so the admin keeps their place in the list.
 */
export function SideDrawer({
  open,
  title,
  subtitle,
  closeLabel,
  footer,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  closeLabel: string;
  footer: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 520 }, display: 'flex', flexDirection: 'column' } } }}
    >
      <Stack
        direction="row"
        sx={{ px: 3, py: 2.5, borderBottom: 1, borderColor: 'divider', alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Box>
          <Typography variant="h4" component="h2">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} aria-label={closeLabel} edge="end">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>{children}</Box>
      <Stack
        direction="row"
        spacing={1.25}
        sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', alignItems: 'center' }}
      >
        {footer}
      </Stack>
    </Drawer>
  );
}

/** "STUDENT                    Step 1 of 3" */
export function DrawerSection({ title, step, children }: { title: string; step?: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ '& + &': { mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' } }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1.75 }}>
        <Typography
          component="h3"
          sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}
        >
          {title}
        </Typography>
        {step && <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', fontWeight: 500 }}>{step}</Typography>}
      </Stack>
      <Stack spacing={1.75}>{children}</Stack>
    </Box>
  );
}
