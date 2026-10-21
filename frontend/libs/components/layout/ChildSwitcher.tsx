import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { MY_CHILDREN } from '@/apollo/user/query';

/**
 * Parent top bar: "Aziz Karimov (9A) | Madina Karimova (9B)". The chosen child lives in the URL
 * (?child=…), so a link or a reload keeps the same child (plan, day 13). The API checks the link.
 */
export function ChildSwitcher() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { data } = useQuery(MY_CHILDREN);
  const children = data?.myChildren ?? [];
  const firstId = children[0]?.id;
  const current = typeof router.query.child === 'string' ? router.query.child : firstId;

  // No child in the URL yet: pick the first one (replace: no extra history entry)
  useEffect(() => {
    if (!router.query.child && firstId) {
      void router.replace({ query: { ...router.query, child: firstId } }, undefined, { shallow: true });
    }
  }, [firstId, router]);

  if (children.length < 2) return null;
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      aria-label={t('shell.children')}
      value={current}
      onChange={(_, child: string | null) =>
        child && void router.replace({ query: { ...router.query, child } }, undefined, { shallow: true })
      }
      sx={{
        bgcolor: '#EFEEEA',
        p: 0.5,
        borderRadius: 999,
        '& .MuiToggleButton-root': {
          border: 0,
          borderRadius: '999px !important',
          px: 1.75,
          py: 0.5,
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: 'text.secondary',
          textTransform: 'none',
        },
        '& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover': {
          bgcolor: 'background.paper',
          color: 'text.primary',
          fontWeight: 600,
          boxShadow: 1,
        },
      }}
    >
      {children.map((c) => (
        <ToggleButton key={c.id} value={c.id}>
          <Stack direction="row" spacing={0.5}>
            <span>{c.firstName} {c.lastName}</span>
            {c.className && <span style={{ opacity: 0.6 }}>({c.className})</span>}
          </Stack>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
