import { Box, ButtonBase, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { isoDay, monthGrid } from '@/libs/components/dashboard/calendar';
import { EASE_OUT } from '@/libs/components/dashboard/motion';
import { STITCH } from '@/libs/components/student/home/parts';

// fade starts at 0.4 (a fast double click restarts it without a flash to blank)
const crossfade = keyframes`
  from { opacity: 0.4; }
`;

/**
 * A Monday-first month of day buttons with up to three coloured dots per day (the colours always
 * have a legend next to them). Used by the student home card and the calendar page.
 */
export function MonthGrid({
  year,
  month,
  dotsOf,
  selected,
  today,
  onSelect,
  dayName,
  dayLabel,
}: {
  year: number;
  month: number;
  /** Dot colours of a day ("YYYY-MM-DD") */
  dotsOf: (day: string) => string[];
  selected: string;
  today: string;
  onSelect: (day: string) => void;
  /** Column heading: 1 = Monday … 7 = Sunday */
  dayName: (weekday: number) => string;
  /** Screen-reader label of a day button */
  dayLabel: (day: number, hasEvents: boolean) => string;
}) {
  return (
    // key = month: the grid crossfades instead of snapping when the month changes
    <Box
      key={`${year}-${month}`}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        rowGap: 0.5,
        textAlign: 'center',
        animation: `${crossfade} 150ms ${EASE_OUT}`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
        <Typography key={d} sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', py: 0.5 }}>
          {dayName(d)}
        </Typography>
      ))}
      {monthGrid(year, month).map((day, i) => {
        if (!day) return <Box key={`blank-${i}`} />;
        const iso = isoDay(year, month, day);
        const dots = [...new Set(dotsOf(iso))].slice(0, 3);
        const isSelected = iso === selected;
        const isToday = iso === today;
        return (
          <ButtonBase
            key={iso}
            onClick={() => onSelect(iso)}
            aria-pressed={isSelected}
            aria-label={dayLabel(day, dots.length > 0)}
            sx={{
              mx: 'auto',
              width: 36,
              height: 40,
              borderRadius: '10px',
              flexDirection: 'column',
              gap: '3px',
              fontSize: '0.8125rem',
              fontWeight: isToday || isSelected ? 700 : 500,
              fontVariantNumeric: 'tabular-nums',
              color: isSelected ? '#fff' : isToday ? STITCH.ink : 'text.primary',
              bgcolor: isSelected ? STITCH.ink : 'transparent',
              outline: isToday && !isSelected ? '1.5px solid' : 'none',
              outlineColor: STITCH.ink,
              transition: `background-color 150ms, color 150ms, transform 150ms ${EASE_OUT}`,
              '&:hover': { bgcolor: isSelected ? STITCH.ink : STITCH.surfaceContainer },
              '&:active': { transform: 'scale(0.95)' },
              '@media (prefers-reduced-motion: reduce)': { '&:active': { transform: 'none' } },
            }}
          >
            {day}
            <Box sx={{ display: 'flex', gap: '2px', height: 4 }}>
              {dots.map((color) => (
                <Box key={color} sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: isSelected ? '#fff' : color }} />
              ))}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
