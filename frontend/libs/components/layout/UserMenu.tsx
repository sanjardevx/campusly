import { useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient } from '@apollo/client/react';
import { Avatar, Box, ButtonBase, Divider, ListItemIcon, Menu, MenuItem, Typography } from '@mui/material';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useTranslation } from 'next-i18next/pages';
import { logOut } from '@/libs/auth';
import type { SessionUser } from '@/libs/auth/api';

export const initialsOf = (u: { firstName: string; lastName: string }) =>
  `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();

/** Name, role line and initials (Stitch top bar); the avatar opens the account menu */
export function UserMenu({ user }: { user: SessionUser }) {
  const { t } = useTranslation('common');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label={t('shell.account')}
        sx={{ borderRadius: 2, px: 1, py: 0.5, gap: 1.5 }}
      >
        <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2 }}>
            {user.firstName} {user.lastName}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.3 }}>
            {t(`shell.subtitle.${user.role}`, { id: user.loginId })}
          </Typography>
        </Box>
        <Avatar sx={{ width: 36, height: 36, fontSize: '0.8125rem', fontWeight: 600, bgcolor: 'primary.main' }}>
          {initialsOf(user)}
        </Avatar>
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <AccountItems user={user} onDone={() => setAnchor(null)} />
      </Menu>
    </>
  );
}

/** "Change password" and "Sign out": the top-bar menu on desktop, "More" on the phone bar */
export function AccountItems({ user, onDone }: { user: SessionUser; onDone: () => void }) {
  const router = useRouter();
  const client = useApolloClient();
  const { t } = useTranslation('common');

  const signOut = async () => {
    onDone();
    await logOut(client);
    const staff = user.role === 'TEACHER' || user.role === 'ADMIN';
    await router.replace(staff ? '/login/teacher' : '/login');
  };

  // A fragment would break MUI Menu's keyboard focus, so the items are returned as an array
  return [
    <MenuItem key="password" component={NextLink} href="/password" onClick={onDone}>
      <ListItemIcon><KeyOutlinedIcon fontSize="small" /></ListItemIcon>
      {t('shell.changePassword')}
    </MenuItem>,
    <Divider key="divider" />,
    <MenuItem key="signout" onClick={() => void signOut()}>
      <ListItemIcon><LogoutOutlinedIcon fontSize="small" /></ListItemIcon>
      {t('shell.signOut')}
    </MenuItem>,
  ];
}
