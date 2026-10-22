import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

/** Page title + one-line explanation + the page's main buttons (Stitch admin screens) */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 3 }}
    >
      <Box>
        <Typography variant="h3" component="h2">
          {title}
        </Typography>
        {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" spacing={1.5}>{actions}</Stack>}
    </Stack>
  );
}
