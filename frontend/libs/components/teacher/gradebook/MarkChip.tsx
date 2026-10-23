import { Box } from '@mui/material';
import { MARK_STYLE } from './model';

/** The 5-point mark next to a % (presentation only: the server stores points, DECISIONS §5) */
export function MarkChip({ mark }: { mark: number | null | undefined }) {
  if (mark == null) return <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>;
  const style = MARK_STYLE[mark] ?? MARK_STYLE[2];
  return (
    <Box component="span" sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.3, color: style.color, bgcolor: style.bg }}>
      {mark}
    </Box>
  );
}
