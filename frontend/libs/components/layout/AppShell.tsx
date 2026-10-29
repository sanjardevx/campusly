import { forwardRef, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useQuery, useReactiveVar } from '@apollo/client/react';
import {
  Box,
  ButtonBase,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Link,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import SchoolIcon from '@mui/icons-material/School';
import { useTranslation } from 'next-i18next/pages';
import { CURRENT_YEAR } from '@/apollo/app/query';
import { crumbVar } from '@/apollo/store';
import type { SessionUser } from '@/libs/auth/api';
import { LanguageSwitcher } from '@/libs/components/LanguageSwitcher';
import { TempPasswordBanner } from '@/libs/components/TempPasswordBanner';
import type { Role } from '@/libs/gql/graphql';
import { tokens } from '@/libs/theme';
import { ChildSwitcher } from './ChildSwitcher';
import { DemoBar } from './DemoBar';
import { GlassTabBar } from './GlassTabBar';
import { SPRING, useTapFirstIndex } from './motion';
import { NAV, useActiveItem, useNavHref, type NavItem } from './nav';
import { NotificationBell } from './NotificationBell';
import { UserMenu, userSubtitle } from './UserMenu';
import { useRoleGuard } from './useRoleGuard';
import { YearPill } from './YearPill';

const SIDEBAR = 256;
const TOPBAR = 64;

/** Student and parent use the phone first: spruce header + floating bottom bar (Stitch mobile) */
const PHONE_FIRST: Role[] = ['STUDENT', 'PARENT'];

/**
 * The frame of every signed-in page: sidebar, top bar, content. One per role area, chosen by
 * each page's getLayout, so it stays mounted while the user moves between pages of that area.
 */
export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const user = useRoleGuard(role);
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  // Session not restored yet, or a redirect is on its way: nothing protected is rendered
  if (!user) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!desktop && PHONE_FIRST.includes(role)) {
    return <PhoneShell user={user}>{children}</PhoneShell>;
  }
  return (
    <DesktopShell user={user} desktop={desktop}>
      {children}
    </DesktopShell>
  );
}

/* ---------- desktop (and teacher / admin on small screens) ---------- */

function DesktopShell({ user, desktop, children }: { user: SessionUser; desktop: boolean; children: ReactNode }) {
  const { t } = useTranslation('common');
  const navHref = useNavHref();
  const [drawer, setDrawer] = useState(false);
  const current = useActiveItem(user.role);
  const crumb = useReactiveVar(crumbVar);
  const announcements = NAV[user.role].flatMap((s) => s.items).find((i) => i.key === 'announcements');

  const sidebar = <Sidebar role={user.role} onNavigate={() => setDrawer(false)} />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: canvasOf(user.role) }}>
      {desktop ? (
        <Box
          component="aside"
          sx={{
            position: 'fixed',
            inset: '0 auto 0 0',
            width: SIDEBAR,
            bgcolor: 'background.paper',
            borderRight: 1,
            borderColor: 'divider',
            zIndex: 30,
          }}
        >
          {sidebar}
        </Box>
      ) : (
        <Drawer open={drawer} onClose={() => setDrawer(false)} slotProps={{ paper: { sx: { width: SIDEBAR } } }}>
          {sidebar}
        </Drawer>
      )}

      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          left: desktop ? SIDEBAR : 0,
          height: TOPBAR,
          px: { xs: 2, md: 4 },
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          // Glass, like a macOS toolbar: the page scrolls under it, blurred
          bgcolor: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: 1,
          borderColor: 'divider',
          zIndex: 20,
          '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))': {
            bgcolor: 'background.paper',
          },
          '@media (prefers-reduced-transparency: reduce)': {
            bgcolor: 'background.paper',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          },
        }}
      >
        {!desktop && (
          <IconButton edge="start" onClick={() => setDrawer(true)} aria-label={t('shell.openMenu')}>
            <MenuIcon />
          </IconButton>
        )}
        {/* Breadcrumb: menu item, then what the page says it shows (Users / Students) */}
        {/* minWidth 0 + ellipsis: a long crumb ("… › Homework 5: … › Aziz Karimov") never pushes the user menu off screen */}
        <Typography component="h1" sx={{ fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {current && crumb ? (
            <>
              <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {t(`nav.${current.key}`)}
              </Box>
              <Box component="span" sx={{ color: 'text.disabled', mx: 1 }}>
                /
              </Box>
              <Box component="span" sx={{ color: 'primary.main' }}>
                {crumb}
              </Box>
            </>
          ) : (
            current && t(`nav.${current.key}`)
          )}
        </Typography>
        {user.role === 'PARENT' && (
          <Box sx={{ ml: 2, display: { xs: 'none', lg: 'block' } }}>
            <ChildSwitcher />
          </Box>
        )}
        <Stack direction="row" spacing={1} sx={{ ml: 'auto', pl: 2, alignItems: 'center', flexShrink: 0 }}>
          {user.role === 'ADMIN' && (
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <YearPill />
            </Box>
          )}
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <LanguageSwitcher />
          </Box>
          {announcements && <NotificationBell href={navHref(announcements.href)} />}
          {/* Admins have no announcements page yet: the bell leads to enquiries (later phase) */}
          {user.role === 'ADMIN' && <NotificationBell href="/_admin/enquiries" unread={false} />}
          <Divider orientation="vertical" flexItem sx={{ my: 2, display: { xs: 'none', sm: 'block' } }} />
          <UserMenu user={user} />
        </Stack>
      </Box>

      <Box component="main" sx={{ ml: desktop ? `${SIDEBAR}px` : 0, pt: `${TOPBAR}px` }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
          <Box sx={{ mb: 2, '&:empty': { display: 'none' } }}>
            <DemoBar user={user} />
          </Box>
          {user.role === 'PARENT' && (
            <Box sx={{ display: { xs: 'block', lg: 'none' }, mb: 2 }}>
              <ChildSwitcher />
            </Box>
          )}
          <Box sx={{ mb: 2, '&:empty': { display: 'none' } }}>
            <TempPasswordBanner />
          </Box>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

function Sidebar({ role, onNavigate }: { role: Role; onNavigate: () => void }) {
  const { t } = useTranslation('common');
  const { data } = useQuery(CURRENT_YEAR);
  const current = useActiveItem(role);
  const portal = t(`shell.portal.${role}`);
  const items = NAV[role].flatMap((s) => s.items);
  const { index, tap } = useTapFirstIndex(items, current);

  const links = useRef<(HTMLElement | null)[]>([]);
  const lens = useRef<HTMLDivElement>(null);

  // Links are not evenly spaced (admin section titles), so the lens is placed on the measured
  // link. Written to the DOM directly: it is pure presentation and needs no re-render.
  useLayoutEffect(() => {
    const el = links.current[index];
    const l = lens.current;
    if (!l) return;
    l.style.opacity = el ? '1' : '0';
    if (!el) return;
    l.style.height = `${el.offsetHeight}px`;
    l.style.transform = `translateY(${el.offsetTop}px)`;
    if (!l.dataset.ready) requestAnimationFrame(() => (l.dataset.ready = '1'));
  }, [index]);

  return (
    <Stack sx={{ height: '100%', p: 2, justifyContent: 'space-between' }}>
      {/* The menu scrolls on short screens; the footer stays at the bottom */}
      <Box sx={{ minHeight: 0, overflowY: 'auto', mx: -2, px: 2, mt: -2, pt: 2 }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center', mx: -2, mt: -2, px: 3, py: 2, mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <SchoolIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>Campusly</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{portal}</Typography>
          </Box>
        </Stack>

        <Box component="nav" sx={{ position: 'relative' }}>
          {/* The lens: one spruce pill that slides to the chosen link (see the effect above) */}
          <Box
            ref={lens}
            aria-hidden
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              opacity: 0,
              borderRadius: 2,
              bgcolor: 'primary.main',
              boxShadow: '0 4px 12px -2px rgba(31,78,67,0.35), inset 0 1px 0 rgba(255,255,255,0.14)',
              // Only after the first placement, so it does not fly in from the top on page load
              '&[data-ready]': { transition: `transform 420ms ${SPRING}, height 420ms ${SPRING}` },
              '@media (prefers-reduced-motion: reduce)': { transition: 'none !important' },
            }}
          />
          <Stack spacing={2}>
            {NAV[role].map((section, s) => (
              <Stack key={section.title ?? s} spacing={0.5}>
                {section.title && (
                  <Typography
                    sx={{
                      px: 1.5,
                      pb: 0.5,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                    }}
                  >
                    {t(`nav.sections.${section.title}`)}
                  </Typography>
                )}
                {section.items.map((item) => {
                  const i = items.indexOf(item);
                  return (
                    <SidebarLink
                      key={item.href}
                      ref={(el) => {
                        links.current[i] = el;
                      }}
                      item={item}
                      active={i === index}
                      current={item === current}
                      onClick={() => {
                        tap(i);
                        onNavigate();
                      }}
                    />
                  );
                })}
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ mx: -2, mb: -2, px: 3, py: 2, borderTop: role === 'ADMIN' ? 1 : 0, borderColor: 'divider' }}>
        {role === 'ADMIN' && (
          // The public site comes with the landing page (day 13); it opens in a new tab
          <Link
            component={NextLink}
            href="/"
            target="_blank"
            underline="hover"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', fontWeight: 500, mb: 0.75 }}
          >
            {t('shell.viewPublicSite')}
            <NorthEastIcon sx={{ fontSize: 14 }} />
          </Link>
        )}
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          {t('shell.footer', {
            portal,
            // Word joiners: "2026–27" never breaks at the dash
            year: (data?.currentAcademicYear?.name ?? '').replace('–', '\u2060–\u2060'),
          })}
        </Typography>
      </Box>
    </Stack>
  );
}

type SidebarLinkProps = { item: NavItem; active: boolean; current: boolean; onClick: () => void };

const SidebarLink = forwardRef<HTMLAnchorElement, SidebarLinkProps>(function SidebarLink(
  { item, active, current, onClick },
  ref,
) {
  const { t } = useTranslation('common');
  const navHref = useNavHref();
  const Icon = item.icon;
  return (
    <ButtonBase
      ref={ref}
      component={NextLink}
      href={navHref(item.href)}
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      sx={{
        position: 'relative', // above the lens
        justifyContent: 'flex-start',
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        fontSize: '0.875rem',
        fontWeight: 500,
        color: active ? 'primary.contrastText' : 'text.secondary',
        transition: 'color 250ms, background-color 150ms',
        '&:hover': active ? undefined : { bgcolor: 'rgba(31,78,67,0.06)', color: 'primary.main' },
      }}
    >
      <Icon sx={{ fontSize: 20 }} />
      {t(`nav.${item.key}`)}
    </ButtonBase>
  );
});

/* ---------- phone (student / parent) ---------- */

/** Students get a slightly darker canvas (DECISIONS §10); staff and parents keep the chalk one */
const canvasOf = (role: Role) => (role === 'STUDENT' ? tokens.studentCanvas : 'background.default');

function PhoneShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const { t } = useTranslation('common');
  const navHref = useNavHref();
  const items = NAV[user.role].flatMap((s) => s.items);
  const announcements = items.find((i) => i.key === 'announcements');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: canvasOf(user.role), pb: 12 }}>
      <Box component="header" sx={{ bgcolor: 'primary.main', color: '#fff', px: 2.5, pt: 3, pb: 3 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography
            sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6 }}
          >
            {t('shell.portal.' + user.role)}
          </Typography>
          <Stack direction="row" sx={{ alignItems: 'center', color: '#fff', '& .MuiIconButton-root': { color: '#fff' } }}>
            <LanguageSwitcher tone="light" />
            {announcements && <NotificationBell href={navHref(announcements.href)} />}
          </Stack>
        </Stack>
        <Typography component="p" sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>
          {user.firstName} {user.lastName}
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', opacity: 0.8 }}>
          {userSubtitle(user, t)}
        </Typography>
      </Box>

      <Box component="main" sx={{ px: 2, pt: 2 }}>
        <Box sx={{ mb: 2, '&:empty': { display: 'none' } }}>
          <DemoBar user={user} />
        </Box>
        {user.role === 'PARENT' && (
          <Box sx={{ mb: 2, overflowX: 'auto' }}>
            <ChildSwitcher />
          </Box>
        )}
        <Box sx={{ mb: 2, '&:empty': { display: 'none' } }}>
          <TempPasswordBanner />
        </Box>
        {children}
      </Box>

      <GlassTabBar user={user} items={items} />
    </Box>
  );
}
