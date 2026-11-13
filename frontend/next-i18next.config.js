// @ts-check
/**
 * Pages Router i18n (DECISIONS §3): English by default, Uzbek, Russian, Korean.
 * Korean is "ko" (a language code), not "kr" (a country code).
 * URLs: /login (en), /uz/login, /ru/login, /ko/login.
 * @type {import('next-i18next/pages').UserConfig}
 */
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'uz', 'ru', 'ko'],
  },
  // Edited JSON files show up without restarting `pnpm dev`
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};
