import { useRouter } from 'next/router';
import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { LANGUAGES } from '@/libs/i18n';

/** Same page, other language: /login → /uz/login (Next.js locale routing) */
export function LanguageSwitcher() {
  const router = useRouter();
  const { t } = useTranslation('common');

  return (
    <TextField
      select
      size="small"
      fullWidth={false}
      label={t('language.label')}
      value={router.locale ?? 'en'}
      onChange={(e) =>
        void router.push(
          { pathname: router.pathname, query: router.query },
          router.asPath,
          { locale: e.target.value },
        )
      }
      sx={{ minWidth: 140 }}
    >
      {LANGUAGES.map((l) => (
        <MenuItem key={l.code} value={l.code}>
          {l.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
