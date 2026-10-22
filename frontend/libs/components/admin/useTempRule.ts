import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'next-i18next/pages';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';

/**
 * "5 sign-ins" / "30 days" in the current language, from the school's password rule
 * (Settings → Accounts). Login slips and credential cards say what the server actually applied.
 */
export function useTempRule(override?: { uses: number; days: number }) {
  const { t } = useTranslation('admin');
  const settings = useQuery(SCHOOL_SETTINGS).data?.schoolSettings;
  const uses = override?.uses ?? settings?.tempPasswordUses ?? 3;
  const days = override?.days ?? settings?.tempPasswordDays ?? 14;
  return {
    signIns: t('slips.nSignIns', { count: uses }),
    days: t('slips.nDays', { count: days }),
  };
}

/** "+998 71 200 00 00 · Mon–Fri 9:00–17:00", or null when the school gave no contact */
export function contactLine(s?: { contactPhone?: string | null; officeHours?: string | null } | null) {
  const parts = [s?.contactPhone, s?.officeHours].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
