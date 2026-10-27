import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Button, Card, IconButton, InputAdornment, ListItemIcon, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import MilitaryTechRoundedIcon from '@mui/icons-material/MilitaryTechRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { useTranslation } from 'next-i18next/pages';
import { ARCHIVE_SITE_HONOR_STUDENT, REORDER_SITE_HONOR_STUDENTS, SET_SITE_HONOR_STUDENT_VISIBLE } from '@/apollo/admin/mutation';
import { ADMIN_SITE_HONOR_STUDENTS } from '@/apollo/admin/query';
import { ConfirmDialog } from '@/libs/components/admin/ConfirmDialog';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { type AdminHonor, HonorDrawer, MEDAL } from '@/libs/components/admin/site/HonorDrawer';
import { SiteSwitch, UnderlineTabs, useReorder } from '@/libs/components/admin/site/shared';
import { layoutFor } from '@/libs/components/layout';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['admin', 'teacher']);

type Tab = 'ON' | 'HIDDEN' | 'ALL';
const GRID = '64px minmax(0, 1fr) 120px 110px 70px 40px';

/**
 * Stitch "Campusly Admin — Website: Honor Students": On the site / Hidden / All, search, a list in
 * the site's order (drag to reorder) — photo with the medal, name and class, "Subject · 1st place
 * — Competition", the result pill, when it was added, the visibility switch and a menu. Hidden
 * rows come after a divider. A child without the parents' consent cannot be switched on.
 */
const HonorStudentsPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const { locale = 'en' } = useRouter();
  const errorText = useErrorText();
  const { data, refetch } = useQuery(ADMIN_SITE_HONOR_STUDENTS, { fetchPolicy: 'cache-and-network' });
  const [setVisible] = useMutation(SET_SITE_HONOR_STUDENT_VISIBLE);
  const [reorder] = useMutation(REORDER_SITE_HONOR_STUDENTS);
  const [archive, { loading: archiving }] = useMutation(ARCHIVE_SITE_HONOR_STUDENT);
  const [tab, setTab] = useState<Tab>('ON');
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<{ honor: AdminHonor | null } | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; honor: AdminHonor } | null>(null);
  const [toArchive, setToArchive] = useState<AdminHonor | null>(null);
  const [error, setError] = useState<string | null>(null);
  // While a new order is being saved, the list shows it already
  const [order, setOrder] = useState<string[] | null>(null);

  const all = data?.adminSiteHonorStudents ?? [];
  const byId = new Map(all.map((h) => [h.id, h]));
  const sorted = (order ?? all.map((h) => h.id)).map((id) => byId.get(id)).filter((h) => !!h);
  const onSite = sorted.filter((h) => h.showOnSite);
  const q = search.trim().toLowerCase();
  const shown = sorted
    .filter((h) => (tab === 'ON' ? h.showOnSite : tab === 'HIDDEN' ? !h.showOnSite : true))
    .filter((h) => !q || [h.student.firstName, h.student.lastName, h.student.loginId, h.competition.en, h.subject.en].some((s) => s.toLowerCase().includes(q)));
  const visible = shown.filter((h) => h.showOnSite);
  const hidden = shown.filter((h) => !h.showOnSite);

  const drag = useReorder(
    sorted.map((h) => h.id),
    (next) => {
      setOrder(next);
      void reorder({ variables: { ids: next } }).finally(() => void refetch().then(() => setOrder(null)));
    },
  );
  const toggle = async (h: AdminHonor, showOnSite: boolean) => {
    setError(null);
    try {
      await setVisible({ variables: { id: h.id, showOnSite } });
      await refetch();
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  const row = (h: AdminHonor) => {
    const medal = h.resultType === 'MEDAL' && h.place ? MEDAL[h.place] : null;
    const added = new Intl.DateTimeFormat(locale === 'uz' ? 'en' : locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(h.createdAt));
    const line = [h.subject.en, medal ? `${t(`site.honor.place${h.place}`)} — ${h.competition.en}` : h.competition.en].join(' · ');
    return (
      <Box key={h.id} {...drag.rowProps(h.id)} sx={{ display: 'grid', gridTemplateColumns: { xs: '40px minmax(0, 1fr) 60px 40px', md: GRID }, gap: 2, px: 2.5, py: 1.5, alignItems: 'center', borderBottom: 1, borderColor: 'divider', opacity: drag.dragging === h.id ? 0.5 : h.showOnSite ? 1 : 0.65 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
          {drag.handle(h.id, t('site.dragToReorder'))}
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums', display: { xs: 'none', md: 'block' } }}>{sorted.indexOf(h) + 1}</Typography>
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box sx={{ position: 'relative', width: 44, aspectRatio: '3 / 4', borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover', flexShrink: 0 }}>
            {h.photoUrl ? <Box component="img" src={h.photoUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <MilitaryTechRoundedIcon sx={{ position: 'absolute', inset: 0, m: 'auto', color: 'text.disabled' }} />}
            {medal && <Box sx={{ position: 'absolute', right: 3, bottom: 3, width: 12, height: 12, borderRadius: '50%', bgcolor: medal.dot, border: '2px solid #fff' }} />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {h.student.firstName} {h.student.lastName}
              </Typography>
              {h.className && <Box component="span" sx={{ px: 0.75, borderRadius: 1, bgcolor: 'action.hover', fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary' }}>{h.className}</Box>}
            </Stack>
            <Typography noWrap sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {line}
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.25, borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, bgcolor: medal ? medal.bg : '#E8EFEA', color: medal ? medal.fg : '#1F4E43' }}>
            <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: medal ? medal.dot : '#2E7D5B' }} />
            {medal ? t(`site.honor.medal.${medal.key}`) : h.score}
          </Box>
        </Box>
        <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.8125rem', color: 'text.secondary' }}>{added}</Typography>
        <SiteSwitch checked={h.showOnSite} label={t('site.honor.onSiteSwitch', { name: `${h.student.firstName} ${h.student.lastName}` })} onToggle={(v) => toggle(h, v)} />
        <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, honor: h })} aria-label={t('site.honor.actions', { name: h.student.firstName })}>
          <MoreVertRoundedIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  };

  return (
    <>
      <PageHeader
        title={t('site.honor.pageTitle')}
        subtitle={t('site.honor.pageSubtitle')}
        actions={
          <>
            <Button variant="outlined" color="inherit" endIcon={<NorthEastRoundedIcon />} href="/#honor-students" target="_blank">
              {t('site.previewOnSite')}
            </Button>
            <Button variant="contained" disableElevation startIcon={<MilitaryTechRoundedIcon />} onClick={() => setDrawer({ honor: null })}>
              {t('site.honor.add')}
            </Button>
          </>
        }
      />
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, mb: 2, alignItems: { md: 'flex-end' } }}>
        <UnderlineTabs
          label={t('site.honor.pageTitle')}
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'ON', label: t('site.honor.tab.ON'), count: onSite.length },
            { key: 'HIDDEN', label: t('site.honor.tab.HIDDEN'), count: sorted.length - onSite.length },
            { key: 'ALL', label: t('site.honor.tab.ALL'), count: sorted.length },
          ]}
        />
        <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('site.honor.search')} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} sx={{ width: { xs: '100%', md: 260 } }} />
      </Stack>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Card>
        <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID, gap: 2, px: 2.5, py: 1.25, borderBottom: 1, borderColor: 'divider', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
          <span>{t('site.honor.col.order')}</span>
          <span>{t('site.honor.col.student')}</span>
          <span>{t('site.honor.col.result')}</span>
          <span>{t('site.honor.col.added')}</span>
          <span>{t('site.honor.col.visibility')}</span>
          <span />
        </Box>
        {shown.length === 0 && <Typography sx={{ p: 3, color: 'text.secondary' }}>{t('site.honor.empty')}</Typography>}
        {visible.map(row)}
        {hidden.length > 0 && (
          <Stack direction="row" sx={{ px: 2.5, py: 1, bgcolor: 'action.hover', alignItems: 'center', justifyContent: 'space-between', gap: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <VisibilityOffOutlinedIcon sx={{ fontSize: 16 }} />
              {t('site.honor.hiddenDivider', { count: hidden.length })}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {t('site.honor.hiddenHint')}
            </Typography>
          </Stack>
        )}
        {hidden.map(row)}
      </Card>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            setDrawer({ honor: menu!.honor });
            setMenu(null);
          }}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          {t('site.edit')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setToArchive(menu!.honor);
            setMenu(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Inventory2OutlinedIcon fontSize="small" color="error" />
          </ListItemIcon>
          {t('site.archive')}
        </MenuItem>
      </Menu>
      <ConfirmDialog
        open={!!toArchive}
        title={t('site.honor.archiveTitle')}
        body={t('site.honor.archiveBody')}
        confirmLabel={t('site.archive')}
        danger
        busy={archiving}
        onClose={() => setToArchive(null)}
        onConfirm={() =>
          void archive({ variables: { id: toArchive!.id } }).then(() => {
            setToArchive(null);
            void refetch();
          })
        }
      />

      {drawer && (
        <HonorDrawer
          key={drawer.honor?.id ?? 'new'}
          honor={drawer.honor}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            void refetch();
          }}
        />
      )}
    </>
  );
};

HonorStudentsPage.getLayout = layoutFor('ADMIN');
export default HonorStudentsPage;
