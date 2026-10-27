import type { SiteHomeQuery } from '@/libs/gql/graphql';
import { scrollToElement } from './motion';

/**
 * Colours and sizes of the Stitch "Campusly Public" screens (Landing Page A/B/C), copied from their
 * Tailwind classes: spruce #1F4E43, the warm canvas #FAF8F4, soft panels #F3F5F2, stone greys.
 */
export const SITE = {
  spruce: '#1F4E43',
  spruceHover: '#163931',
  tint: '#E8EFEA',
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

/** Scroll smoothly to a section (through Lenis when it runs); reduced motion jumps */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) scrollToElement(el);
}
