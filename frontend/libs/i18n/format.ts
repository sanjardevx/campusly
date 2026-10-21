/**
 * Dates for the UI. Browsers have incomplete Uzbek data (Intl prints "2026 M10 30"), so Uzbek
 * uses the local numeric form 30.10.2026; the other languages use the browser's own format.
 */
export function formatDate(value: string | Date, locale = 'en'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (locale === 'uz') {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}
