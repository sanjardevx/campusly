import { useState } from 'react';
import { Box, Button, Divider, IconButton, ListItemIcon, Menu, MenuItem, Stack, Typography } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CloseIcon from '@mui/icons-material/Close';
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { useTranslation } from 'next-i18next/pages';
import type { Role } from '@/libs/gql/graphql';
import type { UserRow } from './UsersTable';

export type ActionKind = 'reset' | 'print' | 'block' | 'unblock' | 'move';

const ICONS = {
  move: DriveFileMoveOutlinedIcon,
  reset: LockResetOutlinedIcon,
  print: PrintOutlinedIcon,
  block: BlockIcon,
  unblock: LockOpenOutlinedIcon,
};
const LABEL = {
  move: 'actions.moveToClass',
  reset: 'actions.resetPassword',
  print: 'actions.printSlips',
  block: 'actions.block',
  unblock: 'actions.unblock',
} as const;

/** Stitch: "2 selected | Move to class · Reset password · Print login slips          Block" */
export function BulkBar({
  count,
  role,
  allBlocked,
  onAction,
  onClear,
}: {
  count: number;
  role: Role;
  allBlocked: boolean;
  onAction: (kind: ActionKind) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation('admin');
  const main: ActionKind[] = role === 'STUDENT' ? ['move', 'reset', 'print'] : ['reset', 'print'];
  const lock: ActionKind = allBlocked ? 'unblock' : 'block';
  const LockIcon = ICONS[lock];

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: 'center',
        flexWrap: 'wrap',
        mb: 2,
        px: 2,
        py: 0.75,
        borderRadius: 2,
        bgcolor: 'primary.light',
        border: '1px solid rgba(31,78,67,0.2)',
        color: 'primary.main',
      }}
    >
      {/* "✕ 2 selected" (Gmail / GitHub): the way out sits with the count, far from the red Block */}
      <IconButton size="small" onClick={onClear} aria-label={t('actions.clearSelection')} sx={{ color: 'primary.main', ml: -1 }}>
        <CloseIcon fontSize="small" />
      </IconButton>
      <Typography sx={{ fontWeight: 700, mr: 1 }}>{t('actions.selected', { count })}</Typography>
      <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(31,78,67,0.3)', my: 0.5 }} />
      {main.map((kind) => {
        const Icon = ICONS[kind];
        return (
          <Button
            key={kind}
            size="small"
            startIcon={<Icon sx={{ fontSize: '16px !important' }} />}
            onClick={() => onAction(kind)}
            sx={{ color: 'primary.main', fontWeight: 500 }}
          >
            {t(LABEL[kind])}
          </Button>
        );
      })}
      <Box sx={{ flexGrow: 1 }} />
      <Button
        size="small"
        startIcon={<LockIcon sx={{ fontSize: '16px !important' }} />}
        onClick={() => onAction(lock)}
        sx={{ color: lock === 'block' ? 'error.main' : 'primary.main', fontWeight: 600 }}
      >
        {t(LABEL[lock])}
      </Button>
    </Stack>
  );
}

/** The ⋮ of one row: the same actions for one person */
export function RowMenu({ user, onAction }: { user: UserRow; onAction: (kind: ActionKind) => void }) {
  const { t } = useTranslation('admin');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const kinds: ActionKind[] = [
    'reset',
    'print',
    ...(user.role === 'STUDENT' ? (['move'] as const) : []),
    user.status === 'BLOCKED' ? 'unblock' : 'block',
  ];
  return (
    <>
      <IconButton
        size="small"
        aria-label={t('actions.menu', { name: `${user.firstName} ${user.lastName}` })}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {kinds.map((kind) => {
          const Icon = ICONS[kind];
          return (
            <MenuItem
              key={kind}
              onClick={() => {
                setAnchor(null);
                onAction(kind);
              }}
              sx={kind === 'block' ? { color: 'error.main' } : undefined}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              {t(LABEL[kind])}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
