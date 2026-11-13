// In Next.js only NEXT_PUBLIC_* variables reach the browser, so no mapping in next.config.js.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
export const API_GRAPHQL_URL = `${API_URL}/graphql`;

/** The site's own address: link previews (og:image) need absolute URLs */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://campusly.uz';

/** Public demo server: the sign-in page shows "Live demo" (the API checks its own DEMO_MODE) */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/** Business dates ("today", the current quarter) use the school's timezone (DECISIONS §5) */
export const SCHOOL_TIMEZONE = 'Asia/Tashkent';
