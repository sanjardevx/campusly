import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { Box, Card, Link, Stack, Typography, alpha, type SxProps, type Theme } from '@mui/material';
import { tokens } from '@/libs/theme';

/**
 * Stitch teacher cards: a header with a rule under it and full-width rows split by thin rules
 * (the admin DashCard pads the whole card instead, so it is not reused here).
 */
export function ListCard({
  title,
  badge,
  action,
  children,
  sx,
}: {
  title: ReactNode;
  /** A pill next to the title ("10 submissions to grade") */
  badge?: ReactNode;
  /** A link on the right ("All announcements →") */
  action?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Card variant="outlined" sx={[{ borderRadius: '12px', minWidth: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Stack
        direction="row"
        sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, minWidth: 0, flexWrap: 'wrap' }}>
          <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            {title}
          </Typography>
          {badge}
        </Stack>
        {action}
      </Stack>
      <Box sx={{ '& > * + *': { borderTop: 1, borderColor: tokens.divider } }}>{children}</Box>
    </Card>
  );
}

/** One row of a ListCard: content left, actions right (stacked on phones) */
export function ListRow({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.75,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        gap: { xs: 1.25, sm: 2 },
        transition: 'background-color 150ms',
        '&:hover': { bgcolor: 'background.default' },
      }}
    >
      <Box sx={{ minWidth: 0 }}>{children}</Box>
      {actions && <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, flexShrink: 0, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>{actions}</Stack>}
    </Box>
  );
}

/** "View full timetable →" style link in a card header */
export function HeaderLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link component={NextLink} href={href} underline="hover" sx={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {children} →
    </Link>
  );
}

type Tone = 'success' | 'warning' | 'neutral';

const TONES: Record<Tone, SxProps<Theme>> = {
  success: { color: 'success.main', bgcolor: 'success.light', borderColor: alpha(tokens.success, 0.25) },
  // Ochre is for time-sensitive notices only (DECISIONS §13): today's attendance, unpublished scores
  warning: { color: 'warning.dark', bgcolor: 'warning.light', borderColor: alpha(tokens.accent, 0.3) },
  neutral: { color: 'text.secondary', bgcolor: 'background.default', borderColor: 'divider' },
};

/** Status pill: a word, optionally with an icon (never colour alone) */
export function Pill({ tone, icon, children, square }: { tone: Tone; icon?: ReactNode; children: ReactNode; square?: boolean }) {
  return (
    <Box
      component="span"
      sx={[
        {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.25,
          border: 1,
          borderRadius: square ? 1 : 999,
          fontSize: '0.75rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
          '& svg': { fontSize: 14 },
        },
        TONES[tone] as object,
      ]}
    >
      {icon}
      {children}
    </Box>
  );
}

/** Course name tag next to an assignment title ("Algebra · 9A") */
export function CourseTag({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{ px: 1, py: 0.125, borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: 'background.default', fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary', whiteSpace: 'nowrap' }}
    >
      {children}
    </Box>
  );
}

/** Empty state inside a card */
export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, py: 4, textAlign: 'center' }}>
      {children}
    </Typography>
  );
}
