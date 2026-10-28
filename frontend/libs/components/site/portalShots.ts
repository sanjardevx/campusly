/**
 * Screenshots of the real portal for the public site's showcase (frontend/public/site/portal/<locale>/):
 * the demo student and parent accounts, captured in every language with a headless Chrome. Each
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

export const PORTAL_SHOTS: Record<ShotLocale, Record<ShotRole, RoleShots>> = {
  en: {
    student: {
      web: [1.0389, 0.7118, 0.65],
      a: { x: 0.3231, y: 0.6019 },
      b: { x: 0.0885, y: 0.2039 },
      phone: [{ ratio: 3.4538, bar: 0.2359 }, { ratio: 4.9103, bar: 0.2359 }],
      c: { x: 0.5, y: 0.7379 },
      sides: [{ ratio: 2.1641, bar: 0.2359 }, { ratio: 2.1641, bar: 0.2359 }],
    },
    parent: {
      web: [0.9236, 0.65, 1.3785],
      a: { x: 0.9286, y: 0.3305 },
      b: { x: 0.0885, y: 0.2233 },
      phone: [{ ratio: 3.6821, bar: 0.2359 }, { ratio: 2.1641, bar: 0.2359 }],
      c: { x: 0.3185, fromBottom: 0.1103 },
      sides: [{ ratio: 2.7769, bar: 0.2359 }, { ratio: 2.8077, bar: 0.2359 }],
    },
  },
  uz: {
    student: {
      web: [1.0389, 0.7118, 0.65],
      a: { x: 0.3231, y: 0.6019 },
      b: { x: 0.0885, y: 0.2039 },
      phone: [{ ratio: 3.4538, bar: 0.2359 }, { ratio: 4.8487, bar: 0.2359 }],
      c: { x: 0.5, y: 0.7379 },
      sides: [{ ratio: 2.1641, bar: 0.2359 }, { ratio: 2.1641, bar: 0.2359 }],
    },
    parent: {
      web: [0.9236, 0.65, 1.3785],
      a: { x: 0.9173, y: 0.3305 },
      b: { x: 0.0885, y: 0.2233 },
      phone: [{ ratio: 3.6821, bar: 0.2359 }, { ratio: 2.1641, bar: 0.2359 }],
      c: { x: 0.3185, fromBottom: 0.1103 },
      sides: [{ ratio: 2.8641, bar: 0.2359 }, { ratio: 2.8077, bar: 0.2359 }],
    },
  },
  ru: {
    student: {
      web: [1.0583, 0.7118, 0.65],
      a: { x: 0.3231, y: 0.5909 },
      b: { x: 0.0885, y: 0.2039 },
      phone: [{ ratio: 3.4538, bar: 0.2359 }, { ratio: 5.0308, bar: 0.2359 }],
      c: { x: 0.5, y: 0.7379 },
      sides: [{ ratio: 2.1641, bar: 0.2359 }, { ratio: 2.1641, bar: 0.2359 }],
    },
    parent: {
      web: [0.9236, 0.65, 1.3785],
      a: { x: 0.9258, y: 0.3305 },
      b: { x: 0.0885, y: 0.2233 },
      phone: [{ ratio: 3.6821, bar: 0.2359 }, { ratio: 2.1641, bar: 0.2359 }],
      c: { x: 0.3185, fromBottom: 0.1103 },
      sides: [{ ratio: 2.7769, bar: 0.2359 }, { ratio: 2.8077, bar: 0.2359 }],
    },
  },
  ko: {
    student: {
      web: [1.0389, 0.7118, 0.65],
      a: { x: 0.3231, y: 0.6019 },
      b: { x: 0.0885, y: 0.2039 },
      phone: [{ ratio: 3.4538, bar: 0.2359 }, { ratio: 4.7872, bar: 0.2359 }],
      c: { x: 0.5, y: 0.7379 },
      sides: [{ ratio: 2.1641, bar: 0.2359 }, { ratio: 2.1641, bar: 0.2359 }],
    },
    parent: {
      web: [0.9236, 0.65, 1.3785],
      a: { x: 0.9336, y: 0.3305 },
      b: { x: 0.0885, y: 0.2233 },
      phone: [{ ratio: 3.6821, bar: 0.2359 }, { ratio: 2.1641, bar: 0.2359 }],
      c: { x: 0.3185, fromBottom: 0.1103 },
      sides: [{ ratio: 2.7769, bar: 0.2359 }, { ratio: 2.8103, bar: 0.2359 }],
    },
  },
};
