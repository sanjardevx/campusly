import { useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Menu, MenuItem } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import { useTranslation } from 'next-i18next/pages';
import { LANGUAGES } from '@/libs/i18n';

/**
 * Stitch style: a quiet "🌐 English ▾" (tone "light" on the spruce header of phones).
 * Same page, other language: /login → /uz/login
 */
export function LanguageSwitcher({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current = LANGUAGES.find((l) => l.code === router.locale) ?? LANGUAGES[0];

  const choose = (locale: string) => {
    setAnchor(null);
    void router.push(
      { pathname: router.pathname, query: router.query },
      router.asPath,
      { locale },
    );
  };

  return (
    <>
      <Button
        size="small"
        color="inherit"
        aria-label={t('language.label')}
        startIcon={<LanguageOutlinedIcon sx={{ fontSize: 16 }} />}
        endIcon={<ArrowDropDownIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          color: tone === 'light' ? 'rgba(255,255,255,0.85)' : 'text.secondary',
          fontWeight: 500,
          fontSize: '0.75rem',
        }}
      >
        {current.label}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {LANGUAGES.map((l) => (
          <MenuItem
            key={l.code}
            selected={l.code === current.code}
            onClick={() => choose(l.code)}
          >
            {l.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
