import { Box } from '@mui/material';
import { accent, markTone } from '@/libs/accent';

/** The 5-point mark on its band colour (5 green, 4 blue, 3 amber, 2 red): the number is always shown */
export function MarkBadge({ mark }: { mark: number }) {
  const { fg, bg } = accent[markTone(mark).tone];
  return (
    <Box
      component="span"
      sx={{ display: 'inline-block', minWidth: 22, px: 0.75, borderRadius: 1, bgcolor: bg, color: fg, fontSize: '0.75rem', fontWeight: 700, lineHeight: '1.25rem', textAlign: 'center', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
    >
      {mark}
    </Box>
  );
}
