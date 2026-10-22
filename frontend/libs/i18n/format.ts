const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Dates for the UI. Browsers have incomplete Uzbek data (Intl prints "2026 M10 30"), so Uzbek
 * uses the local numeric form 30.10.2026; the other languages use the browser's own format.
 */
export function formatDate(value: string | Date, locale = 'en'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (locale === 'uz') {
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

/**
 * How long ago a user was active, like Stitch: "Today, 08:12" · "Yesterday" · "3 days ago" ·
 * "2 weeks ago" · then a date. Calendar days on the viewer's clock, so "yesterday" means the
 * previous date, not "24 hours ago". The plural forms come from i18next (daysAgo_one/_few/...).
 */
export function formatLastSeen(
  value: string | Date,
  locale: string | undefined,
  t: (key: string, options: { time?: string; count?: number }) => string,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(date)) / 86_400_000);

  if (days <= 0) return t('time.today', { time: `${pad(date.getHours())}:${pad(date.getMinutes())}` });
  if (days === 1) return t('time.yesterday', {});
  if (days < 7) return t('time.daysAgo', { count: days });
  if (days < 35) return t('time.weeksAgo', { count: Math.floor(days / 7) });
  return formatDate(date, locale);
}

/** "+998901234567" → "+998 90 123 45 67" (Uzbek numbers); anything else is shown as stored */
export function formatPhone(phone: string): string {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

/**
 * A calendar day from the API ("2026-09-02", no time): read as that day on the viewer's clock.
 * new Date("2026-09-02") would be UTC midnight, i.e. 1 September in America.
 */
export function formatDay(day: string, locale = 'en'): string {
  const [y, m, d] = day.split('-').map(Number);
  return formatDate(new Date(y, m - 1, d), locale);
}
