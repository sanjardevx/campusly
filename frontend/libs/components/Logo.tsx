import { Box } from '@mui/material';
import { Lora } from 'next/font/google';

/**
 * The Campusly logo: a school arch in double lines with an open book in the doorway, and the name
 * in spaced serif capitals (after the crest-and-serif logos of Tashkent's private schools).
 * "brand" sits on light backgrounds, "light" on spruce panels and photos. The favicon
 * (public/favicon.svg) is the same arch, filled, on a spruce tile.
 */
const lora = Lora({ subsets: ['latin'], weight: '500', display: 'swap' });

const TONES = {
  // The mark's gold is decorative; the line under the name uses a darker gold that passes 4.5:1
  brand: { main: '#1F4E43', gold: '#C59A3E', text: '#7A5C1E' },
  light: { main: '#FFFFFF', gold: '#E5C376', text: '#F3DFA8' },
} as const;

type Tone = keyof typeof TONES;
type Size = number | { xs: number; md: number };

/** The arch and the book, 48 × 48. Decorative: the name next to it says what it is. */
export function LogoMark({ tone = 'brand' }: { tone?: Tone }) {
  const { main, gold } = TONES[tone];
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden focusable="false" style={{ display: 'block' }}>
      <g fill="none" stroke={main} strokeWidth={1.7} strokeLinejoin="round">
        <path d="M8 42V20A16 16 0 0 1 40 20V42" />
        <path d="M13.5 42V21A10.5 10.5 0 0 1 34.5 21V42" />
        <path d="M4.5 42H43.5" />
      </g>
      {/* The book keeps about 3 units of air to the arch on every side */}
      <g fill="none" stroke={gold} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 28.7C22 27.3 19.8 26.9 17.8 27.2V34.9C19.8 34.6 22 35 24 36.4C26 35 28.2 34.6 30.2 34.9V27.2C28.2 26.9 26 27.3 24 28.7Z" />
        <path d="M24 28.7V36.4" />
        <path d="M19.9 29.6C20.9 29.5 21.8 29.8 22.4 30.2M19.9 32C20.9 31.9 21.8 32.2 22.4 32.6" />
        <path d="M28.1 29.6C27.1 29.5 26.2 29.8 25.6 30.2M28.1 32C27.1 31.9 26.2 32.2 25.6 32.6" />
      </g>
    </svg>
  );
}

/**
 * The mark with the name and a small line under it ("School · Tashkent" by default, the portal's
 * name inside the portals). `size` is the name's font size in px; everything else scales with it.
 */
export function Logo({ tone = 'brand', size = 18, subtitle = 'School · Tashkent' }: { tone?: Tone; size?: Size; subtitle?: string }) {
  const { main, text } = TONES[tone];
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.55em',
        fontSize: size,
        lineHeight: 1,
        color: main,
        transition: 'color 300ms ease',
        // On photos (the site's hero) a soft shadow keeps the thin lines and the small gold line readable
        filter: tone === 'light' ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' : 'none',
      }}
    >
      <Box sx={{ width: '2.2em', height: '2.2em', flexShrink: 0 }}>
        <LogoMark tone={tone} />
      </Box>
      <Box sx={{ fontFamily: lora.style.fontFamily, textAlign: 'left', whiteSpace: 'nowrap' }}>
        <Box component="span" sx={{ display: 'block', fontWeight: 500, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          Campusly
        </Box>
        <Box component="span" sx={{ display: 'block', mt: '0.4em', fontSize: '0.5em', letterSpacing: '0.42em', textTransform: 'uppercase', color: text }}>
          {subtitle}
        </Box>
      </Box>
    </Box>
  );
}
