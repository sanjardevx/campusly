import type { SiteHomeQuery } from '@/libs/gql/graphql';
import { scrollToElement } from './motion';

/**
 * Colours and sizes of the Stitch "Campusly Public" screens (Landing Page A/B/C), copied from their
 * Tailwind classes: the warm canvas #FAF8F4, soft panels #F3F5F2, stone greys. The green is the lighter
 * one the developer picked on day 20 (#2F7A63) instead of Stitch's spruce #1F4E43.
 */
export const SITE = {
  spruce: '#2F7A63',
  spruceHover: '#276852',
  tint: '#E5F1EB',
  soft: '#F3F5F2',
  canvas: '#FAF8F4',
  ink: '#111827',
  text: '#1F2328',
  heading: '#171717',
  stone700: '#44403C',
  stone600: '#57534E',
  stone500: '#78716C',
  stone400: '#A8A29E',
  stone200: '#E7E5E4',
  stone100: '#F5F5F4',
  neutral600: '#525252',
  neutral500: '#737373',
  neutral300: '#D4D4D4',
  cardBorder: '#E8E5DF',
  cardShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  statShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.06)',
  /** Tailwind max-w-6xl */
  container: 1152,
} as const;

/**
 * Icon tile colours of the public site (DECISIONS §13, "Public site icons"): a gradient per hue with
 * a white glyph, picked by meaning (safety and campus green, health rose, learning violet …).
 * White passes 3:1 on both ends of every gradient. The site's own palette, not the portal's.
 */
export const SITE_TONES = {
  green: { from: '#4FA383', to: '#2F7A63' },
  teal: { from: '#1A9890', to: '#0F766E' },
  sky: { from: '#2290C8', to: '#0B6FA8' },
  blue: { from: '#4A7FE6', to: '#1E56C8' },
  violet: { from: '#8466E6', to: '#5B3FCF' },
  rose: { from: '#E35A7A', to: '#C2304F' },
  orange: { from: '#D9722A', to: '#A94C08' },
} as const;

export type SiteTone = keyof typeof SITE_TONES;

export type SiteData = SiteHomeQuery['siteHome'];

/** "Oct 24, 2026" for a calendar date (noon, so no timezone can move it to another day) */
export function siteDate(iso: string, locale = 'en'): string {
  const date = new Date(`${iso}T12:00:00`);
  if (locale === 'uz') {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

/** Small caps line above a section title ("CAMPUS UPDATES") */
export const eyebrowSx = {
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: SITE.spruce,
} as const;

export const sectionTitleSx = {
  fontSize: '1.875rem',
  fontWeight: 700,
  letterSpacing: '-0.025em',
  color: SITE.heading,
  lineHeight: 1.2,
} as const;

/** Centred page column with Tailwind's px-6 */
export const containerSx = { maxWidth: SITE.container, mx: 'auto', px: { xs: 2, sm: 3 } } as const;

/**
 * A list of cards that phones swipe sideways (CSS scroll snap, no JS) and wider screens show as a
 * grid. The next card peeks in at the edge, so the row reads as "more →"; the row runs to the
 * screen edges (negative margin = the container padding) and snaps to the padding.
 */
export const swipeRowSx = (columns: Record<string, string>, gap = 3) =>
  ({
    display: { xs: 'flex', md: 'grid' },
    gridTemplateColumns: columns,
    gap,
    overflowX: { xs: 'auto', md: 'visible' },
    scrollSnapType: { xs: 'x mandatory', md: 'none' },
    overscrollBehaviorX: 'contain',
    mx: { xs: -2, sm: -3, md: 0 },
    px: { xs: 2, sm: 3, md: 0 },
    scrollPaddingInline: { xs: '16px', sm: '24px' },
    // Room for the cards' shadows inside the scroller
    py: { xs: 1, md: 0 },
    my: { xs: -1, md: 0 },
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
    '& > *': { flex: { xs: '0 0 84%', sm: '0 0 46%' }, minWidth: 0, scrollSnapAlign: 'start' },
  }) as const;

/** Scroll smoothly to a section (through Lenis when it runs); reduced motion jumps */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) scrollToElement(el);
}
