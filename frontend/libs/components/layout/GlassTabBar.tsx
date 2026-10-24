import { useState } from 'react';
import NextLink from 'next/link';
import { Box, ButtonBase, Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { useTranslation } from 'next-i18next/pages';
import type { SessionUser } from '@/libs/auth/api';
import { tokens } from '@/libs/theme';
import { useActiveItem, useNavHref, type NavItem } from './nav';
import { SPRING, useTapFirstIndex } from './motion';
import { AccountItems } from './UserMenu';

/**
 * Phone tab bar in the iOS 26 "Liquid Glass" style: a floating capsule of frosted glass with a
 * light edge, and one glass lens under the active tab that slides to the next tab.
 * CSS only (backdrop-filter): SVG refraction filters do not work in Safari, i.e. on iPhones.
 */
export function GlassTabBar({ user, items: all }: { user: SessionUser; items: NavItem[] }) {
  const { t } = useTranslation('common');
  // Five places in the bar; the rest (tab: false) open from "More"
  const items = all.filter((i) => i.tab !== false);
  const extra = all.filter((i) => i.tab === false);
  const navHref = useNavHref();
  const current = useActiveItem(user.role);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const { index, tap } = useTapFirstIndex(items, current);
  const count = items.length + 1; // + "More"

  return (
    <Box
      component="nav"
      sx={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        maxWidth: 380,
        mx: 'auto',
        height: 62,
        p: '5px',
        borderRadius: 999,
        zIndex: 50,
        // The glass: what is behind is blurred and made more vivid, the surface is barely white
        background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
        backdropFilter: 'blur(22px) saturate(180%)',
        WebkitBackdropFilter: 'blur(22px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: [
          '0 12px 32px rgba(31,78,67,0.16)', // lifted off the page
          '0 2px 6px rgba(0,0,0,0.06)',
          'inset 0 1px 0 rgba(255,255,255,0.9)', // light catching the top edge
          'inset 0 -1px 0 rgba(255,255,255,0.3)',
        ].join(', '),
        // Specular sheen on the upper half
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 50%)',
          pointerEvents: 'none',
        },
        // No blur support, or the user asked for less transparency: plain solid bar
        '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))': {
          background: 'rgba(255,255,255,0.97)',
        },
        '@media (prefers-reduced-transparency: reduce)': {
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
        },
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex', height: '100%' }}>
        {/* The lens: tabs share the width equally, so moving it is just index × its own width */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: `${100 / count}%`,
            transform: `translateX(${Math.max(index, 0) * 100}%)`,
            opacity: index < 0 ? 0 : 1,
            borderRadius: 999,
            bgcolor: 'rgba(31,78,67,0.11)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 0 0 0.5px rgba(31,78,67,0.08)',
            transition: `transform 480ms ${SPRING}, opacity 200ms`,
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}
        />
        {items.map((item, i) => {
          const Icon = item.icon;
          const active = i === index;
          return (
            <ButtonBase
              key={item.href}
              component={NextLink}
              href={navHref(item.href)}
              onClick={() => tap(i)}
              aria-current={item === current ? 'page' : undefined}
              sx={tabSx(active)}
            >
              <Icon />
              {/* Short tab names ("News", not "Announcements"): five tabs share the bar */}
              <span>{t(`nav.tab.${item.key}`)}</span>
            </ButtonBase>
          );
        })}
        <ButtonBase onClick={(e) => setAnchor(e.currentTarget)} sx={tabSx(false)}>
          <MoreHorizIcon />
          <span>{t('nav.more')}</span>
        </ButtonBase>
      </Box>

      {/* Same actions as the desktop account menu, opened upwards */}
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {extra.map((item) => {
          const Icon = item.icon;
          return (
            <MenuItem key={item.href} component={NextLink} href={navHref(item.href)} onClick={() => setAnchor(null)}>
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t(`nav.${item.key}`)}</ListItemText>
            </MenuItem>
          );
        })}
        {extra.length > 0 && <Divider />}
        <AccountItems user={user} onDone={() => setAnchor(null)} />
      </Menu>
    </Box>
  );
}

const tabSx = (active: boolean) => ({
  flex: 1,
  minWidth: 0,
  flexDirection: 'column',
  gap: '2px',
  borderRadius: 999,
  fontSize: '0.6875rem',
  fontWeight: active ? 600 : 500,
  color: active ? tokens.primary : '#3F4743',
  transition: `transform 200ms ${SPRING}, color 200ms`,
  '& svg': { fontSize: 22 },
  '& span': { maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  // Pressed: the tab gives a little, like a soft key
  '&:active': { transform: 'scale(0.92)' },
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
});
