import type { ReactNode } from 'react';
import { Box, Card, Stack, Typography, type SxProps, type Theme } from '@mui/material';

/** The white card every dashboard block sits in (Stitch: 10 px corners, 20 px padding) */
export function DashCard({
  title,
  subtitle,
  action,
  children,
  divided,
  sx,
}: {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  /** A rule under the header (tables and lists) */
  divided?: boolean;
  sx?: SxProps<Theme>;
}) {
  return (
    <Card variant="outlined" sx={[{ borderRadius: '12px', p: 2.5, display: 'flex', flexDirection: 'column', minWidth: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          ...(divided && { pb: 2, borderBottom: 1, borderColor: 'divider' }),
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      {children}
    </Card>
  );
}
