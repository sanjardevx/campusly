import shots from './portalShots.json';

/**
 * Screenshots of the real portal for the public site's showcase (frontend/public/site/portal/<locale>/):
 * the demo student and parent accounts, captured in every language with a headless Chrome
 * (scripts/capture-portal-shots.mjs; run it again when the portal's UI changes). Each
 * role has three web pages (the dashboard, the page "a" opens, the page "b" opens), two phone pages
 * (the home, the page "c" opens), two more phone pages for the side phones, and the phone's bottom
 * bar cut out separately so it stays put while the page scrolls.
 *
 * ratio = height / width of a page; a, b = where the clicked link is on web page 1 and 2 (fractions
 * of the width and the height); c = the tapped link on the phone (x in widths; y in widths from the
 * page top, or fromBottom in widths from the screen bottom for a tab in the bottom bar); bar = the
 * height of the bottom bar strip in widths, or null.
 */
export type ShotLocale = 'en' | 'uz' | 'ru' | 'ko';
export type ShotRole = 'student' | 'parent';
export interface PhoneShot {
  ratio: number;
  bar: number | null;
}
export interface RoleShots {
  web: [number, number, number];
  a: { x: number; y: number };
  b: { x: number; y: number };
  phone: [PhoneShot, PhoneShot];
  c: { x: number; y?: number; fromBottom?: number };
  sides: [PhoneShot, PhoneShot];
}

/** The header colour of the phone pages (the status bar takes it) */
export const PORTAL_HEADER = '#1F4E43';

export const shotSrc = (locale: ShotLocale, role: ShotRole, name: string, bar = false) => `/site/portal/${locale}/${role}-${name}${bar ? '-bar' : ''}.webp`;

/** Written by scripts/capture-portal-shots.mjs */
export const PORTAL_SHOTS = shots as Record<ShotLocale, Record<ShotRole, RoleShots>>;
