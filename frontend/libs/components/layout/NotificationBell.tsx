import NextLink, { type LinkProps } from 'next/link';
import { useQuery } from '@apollo/client/react';
import { Badge, IconButton } from '@mui/material';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import { useTranslation } from 'next-i18next/pages';
import { UNREAD_ANNOUNCEMENTS } from '@/apollo/app/query';

/** The bell: unread announcements (school-wide + the viewer's courses), opens the announcements page */
export function NotificationBell({ href, unread: count = true }: { href: LinkProps['href']; unread?: boolean }) {
  const { t } = useTranslation('common');
  const { data } = useQuery(UNREAD_ANNOUNCEMENTS, { fetchPolicy: 'cache-and-network', skip: !count });
  const unread = data?.announcements.unread ?? 0;

  return (
    <IconButton component={NextLink} href={href} aria-label={t('shell.notifications')}>
      <Badge badgeContent={unread} color="warning" max={9}>
        <NotificationsOutlinedIcon />
      </Badge>
    </IconButton>
  );
}
