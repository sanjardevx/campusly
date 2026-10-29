import { Box } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import { KIND, accent, type Kind } from '@/libs/accent';

/**
 * A kind's icon on its soft tint (lesson, homework, quiz, …), the same everywhere.
 * `icon` replaces the kind's default when a row knows better (a video lesson, say); the colour
 * still comes from the kind. Decorative: the row's text says what it is.
 */
export function KindIcon({ kind, icon, size = 36 }: { kind: Kind; icon?: SvgIconComponent; size?: number }) {
  const Icon = icon ?? KIND[kind].icon;
  const { fg, bg } = accent[KIND[kind].tone];
  return (
    <Box
      aria-hidden
      sx={{ width: size, height: size, flexShrink: 0, borderRadius: size >= 36 ? '10px' : '8px', display: 'grid', placeItems: 'center', bgcolor: bg, color: fg }}
    >
      <Icon sx={{ fontSize: Math.round(size * 0.55) }} />
    </Box>
  );
}
