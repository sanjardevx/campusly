// Client-side i18n helpers. The server part (getStaticProps) is in ./server.ts
import { useTranslation } from 'next-i18next/pages';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'uz', label: 'O‘zbekcha' },
  { code: 'ru', label: 'Русский' },
  { code: 'ko', label: '한국어' },
] as const;

/**
 * Backend error code → a sentence in the current language. The UI never shows the server's
 * English message and never compares messages (Nestar did: 'Definer: user has been blocked!').
 */
export function useErrorText() {
  const { t } = useTranslation('errors');
  return (code: string | undefined) =>
    t(code ?? 'UNKNOWN', { defaultValue: t('UNKNOWN') });
}
