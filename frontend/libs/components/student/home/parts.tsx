import type { ReactNode } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { EASE_OUT, fadeUp } from '@/libs/components/dashboard/motion';

/**
 * Tokens of the Stitch "Student Dashboard (Compact eCampus)" screen (DECISIONS §10): the soft,
 * borderless pills and the darker heading ink differ from the admin / teacher cards.
 */
export const STITCH = {
  ink: '#01372D',
  surfaceContainer: '#E9EFEA',
  outline: 'rgba(192, 200, 196, 0.4)',
  outlineSoft: 'rgba(192, 200, 196, 0.2)',
  onSurfaceVariant: '#404945',
  rowShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  liftShadow: '0 6px 16px rgba(1, 55, 45, 0.08)',
};

const fadeOnly = keyframes`
  from { opacity: 0; }
`;

/** Reduced motion keeps a gentle fade, never movement ("fewer and gentler, not zero") */
const reducedFade = (index: number) => ({
  '@media (prefers-reduced-motion: reduce)': { animation: `${fadeOnly} 200ms ease ${index * 40}ms backwards` },
});

/**
 * Entrance for cards that also lift on hover: fill-mode "backwards" so the finished animation
 * does not hold `transform` and block the hover lift (fadeUp keeps "both" for static cards).
 */
export const enter = (index: number) => ({ ...fadeUp(index), animationFillMode: 'backwards', ...reducedFade(index) });

/** Hover only for a real mouse: touch screens report hover too and would keep a stuck lift */
const MOUSE = '@media (hover: hover) and (pointer: fine)';

/** Student motion (DECISIONS §10): a clickable card lifts 2 px on hover and presses to 0.98 */
export const liftSx = {
  transition: `transform 200ms ${EASE_OUT}, box-shadow 200ms ${EASE_OUT}, border-color 150ms ease`,
  [MOUSE]: { '&:hover': { transform: 'translateY(-2px)', boxShadow: STITCH.liftShadow } },
  '&:active': { transform: 'scale(0.98)', transitionDuration: '120ms' },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'border-color 150ms ease',
    '&:hover, &:active': { transform: 'none' },
  },
};

/** Buttons answer a press: scale 0.97 in 160 ms (no movement with reduced motion) */
export const pressSx = {
  transition: `transform 160ms ${EASE_OUT}, background-color 200ms ease, border-color 200ms ease`,
  '&:active': { transform: 'scale(0.97)' },
  '@media (prefers-reduced-motion: reduce)': { '&:active': { transform: 'none' } },
};

/**
 * "Stretched link": the button's ::after covers its card (position: relative), so the whole row
 * opens the same page without nesting a link inside a link. The card's own :active gives the press.
 */
export const stretchedSx = {
  position: 'static',
  '&::after': { content: '""', position: 'absolute', inset: 0, borderRadius: '12px' },
  '&:active': { transform: 'none' },
};

const fill = keyframes`
  from { transform: scaleX(0); }
`;

/** A progress bar that fills from 0 (scaleX, not width: no layout work) */
export function ProgressBar({ value, label, index = 0 }: { value: number; label: string; index?: number }) {
  return (
    <Box
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      sx={{ height: 6, borderRadius: 999, bgcolor: STITCH.surfaceContainer, overflow: 'hidden' }}
    >
      <Box
        sx={{
          height: '100%',
          borderRadius: 999,
          bgcolor: STITCH.ink,
          transform: `scaleX(${value / 100})`,
          transformOrigin: 'left',
          animation: `${fill} 600ms ${EASE_OUT} both`,
          animationDelay: `${150 + index * 50}ms`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
    </Box>
  );
}

const PILL = {
  mint: { bgcolor: '#BCEDDA', color: '#406D5E' },
  peach: { bgcolor: '#FFDBCA', color: '#763300' },
  neutral: { bgcolor: STITCH.surfaceContainer, color: STITCH.onSurfaceVariant },
};

/** "45% watched" (mint), "Due in 2 days" (peach), "3 Pending" (neutral): a word on a soft tint */
export function SoftPill({ tone, children }: { tone: keyof typeof PILL; children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{ ...PILL[tone], px: 1, py: 0.25, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, lineHeight: '1rem', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
    >
      {children}
    </Box>
  );
}

/** Section title + one muted line ("This week", "My Courses") */
export function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography component="h2" sx={{ fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: '0.84375rem', lineHeight: '1.375rem', color: 'text.secondary' }}>{subtitle}</Typography>
    </Box>
  );
}

/** Stitch's segmented control: quarter tabs on Grades, All / Unread / School on Announcements */
export function SegmentedTabs({ tabs, value, onChange }: { tabs: { id: string; label: ReactNode }[]; value: string; onChange: (id: string) => void }) {
  return (
    <Stack role="tablist" direction="row" sx={{ gap: 0.5, p: 0.5, borderRadius: 2, bgcolor: '#EFF5F0', border: 1, borderColor: STITCH.outline, overflowX: 'auto', maxWidth: '100%', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <ButtonBase
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            sx={{
              px: 1.75,
              py: 0.75,
              borderRadius: 1.5,
              whiteSpace: 'nowrap',
              fontSize: '0.84375rem',
              fontWeight: active ? 600 : 500,
              fontVariantNumeric: 'tabular-nums',
              color: active ? STITCH.ink : 'text.secondary',
              bgcolor: active ? '#fff' : 'transparent',
              boxShadow: active ? STITCH.rowShadow : 'none',
              transition: 'background-color 150ms ease, color 150ms ease',
              '&:hover': { color: 'text.primary' },
            }}
          >
            {tab.label}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}
