import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Avatar, Box, Button, ButtonBase, Card, Collapse, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { useTranslation } from 'next-i18next/pages';
import { REORDER_SITE_PROGRAMS, SET_SITE_PROGRAM_VISIBLE } from '@/apollo/admin/mutation';
import { ADMIN_SITE_PROGRAMS } from '@/apollo/admin/query';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { type AdminProgram, ProgramDrawer } from '@/libs/components/admin/site/ProgramDrawer';
import { SiteSwitch, editedLine, useReorder } from '@/libs/components/admin/site/shared';
import { layoutFor } from '@/libs/components/layout';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['admin', 'teacher']);

type Tab = 'ON' | 'HIDDEN' | 'ALL';
/** The home page grid shows the first 6 programs that are on the site */
const HOME = 6;
const GRID = '64px minmax(0, 1fr) 130px 90px 40px';

/**
 * Stitch "Campusly Admin — Website: Programs": On the site / Hidden / All, search, a draggable list
 * (#, photo, name + category, grades, on-site switch, expand) with a divider after the six the
 * home page shows; a row opens to schedule, room, teacher, level, media, last edit, description.
 */
const ProgramsPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const { locale = 'en' } = useRouter();
  const { data, refetch } = useQuery(ADMIN_SITE_PROGRAMS, { fetchPolicy: 'cache-and-network' });
  const [setVisible] = useMutation(SET_SITE_PROGRAM_VISIBLE);
  const [reorder] = useMutation(REORDER_SITE_PROGRAMS);
  const [tab, setTab] = useState<Tab>('ON');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ program: AdminProgram | null } | null>(null);
  // While a new order is being saved, the list shows it already
  const [order, setOrder] = useState<string[] | null>(null);

  const all = data?.adminSitePrograms ?? [];
  const byId = new Map(all.map((p) => [p.id, p]));
  const sorted = (order ?? all.map((p) => p.id)).map((id) => byId.get(id)).filter((p) => !!p);
  const onSite = sorted.filter((p) => p.showOnSite);
  const homeIds = new Set(onSite.slice(0, HOME).map((p) => p.id));
  const q = search.trim().toLowerCase();
  const shown = sorted
    .filter((p) => (tab === 'ON' ? p.showOnSite : tab === 'HIDDEN' ? !p.showOnSite : true))
    .filter((p) => !q || [p.name.en, p.name.uz, p.name.ru, p.name.ko].some((s) => s?.toLowerCase().includes(q)));
  // Stitch: on-site rows first, then a divider, then the rest
  const first = shown.filter((p) => homeIds.has(p.id));
  const rest = shown.filter((p) => !homeIds.has(p.id));

  const drag = useReorder(
    sorted.map((p) => p.id),
    (next) => {
      setOrder(next);
      void reorder({ variables: { ids: next } }).finally(() => void refetch().then(() => setOrder(null)));
    },
  );

  const row = (p: AdminProgram) => {
    const expanded = open === p.id;
    const number = sorted.indexOf(p) + 1;
    const schedule = [p.days.map((d) => t(`site.programs.day.${d}`)).join(', '), p.startTime && p.endTime ? `${p.startTime}–${p.endTime}` : null].filter(Boolean).join(' · ');
    return (
      <Box key={p.id} {...drag.rowProps(p.id)} sx={{ borderBottom: 1, borderColor: 'divider', opacity: drag.dragging === p.id ? 0.5 : 1 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '40px minmax(0, 1fr) 60px 40px', md: GRID }, gap: 2, px: 2.5, py: 1.25, alignItems: 'center' }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
            {drag.handle(p.id, t('site.dragToReorder'))}
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums', display: { xs: 'none', md: 'block' } }}>{number}</Typography>
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box sx={{ width: 48, height: 36, borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover', flexShrink: 0 }}>{p.photoUrl && <Box component="img" src={p.photoUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</Box>
            <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              {p.name.en}
            </Typography>
            <Box sx={{ flexShrink: 0, px: 1, py: 0.125, borderRadius: 1, fontSize: '0.6875rem', fontWeight: 600, bgcolor: 'action.hover', color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>{t(`site.programs.cat.${p.category}`)}</Box>
          </Stack>
          <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.875rem', color: 'text.secondary' }}>{t('site.programs.grades2', { from: p.gradeFrom, to: p.gradeTo })}</Typography>
          <SiteSwitch checked={p.showOnSite} label={t('site.programs.onSiteSwitch', { name: p.name.en })} onToggle={(v) => setVisible({ variables: { id: p.id, showOnSite: v } }).then(() => refetch())} />
          <IconButton size="small" onClick={() => setOpen(expanded ? null : p.id)} aria-expanded={expanded} aria-label={expanded ? t('site.collapse') : t('site.expand')}>
            {expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
          </IconButton>
        </Box>
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ mx: 2.5, mb: 2, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
              <Detail label={t('site.programs.schedule')} value={schedule || '—'} />
              <Detail label={t('site.programs.level')} value={p.levelNote?.en ?? '—'} />
              <Detail label={t('site.programs.room')} value={p.room ?? '—'} />
              <Detail label={t('site.programs.media')} value={p.videoUrl ? t('site.programs.video') : p.photoUrl ? t('site.programs.photo') : '—'} />
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, fontSize: '0.875rem' }}>
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  {t('site.programs.teacher')}:
                </Box>
                {p.teachers.length === 0
                  ? '—'
                  : p.teachers.map((x) => (
                      <Stack key={x.id} direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: '0.625rem', bgcolor: 'primary.main' }}>{x.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</Avatar>
                        {x.name}
                      </Stack>
                    ))}
              </Stack>
              <Detail label={t('site.programs.lastEdited')} value={editedLine(p.updatedAt, p.editedBy, locale)} />
            </Box>
            <Typography sx={{ mt: 1, fontSize: '0.875rem' }}>
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {t('site.programs.description')}:{' '}
              </Box>
              {p.description.en}
            </Typography>
            <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
              <Button size="small" color="inherit" onClick={() => void setVisible({ variables: { id: p.id, showOnSite: !p.showOnSite } }).then(() => refetch())}>
                {p.showOnSite ? t('site.programs.hide') : t('site.programs.show')}
              </Button>
              <Button size="small" variant="contained" disableElevation onClick={() => setDrawer({ program: p })}>
                {t('site.edit')}
              </Button>
            </Stack>
          </Box>
        </Collapse>
      </Box>
    );
  };

  return (
    <>
      <PageHeader
        title={t('site.programs.pageTitle')}
        subtitle={t('site.programs.pageSubtitle')}
        actions={
          <>
            <Button variant="outlined" color="inherit" endIcon={<NorthEastRoundedIcon />} href="/#programs" target="_blank">
              {t('site.previewOnSite')}
            </Button>
            <Button variant="contained" disableElevation startIcon={<AddRoundedIcon />} onClick={() => setDrawer({ program: null })}>
              {t('site.programs.new')}
            </Button>
          </>
        }
      />
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, mb: 2, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
        <Stack direction="row" sx={{ gap: 0.5, p: 0.5, borderRadius: 2, bgcolor: 'action.hover', alignSelf: 'flex-start' }} role="tablist">
          {(['ON', 'HIDDEN', 'ALL'] as const).map((k) => (
            <ButtonBase key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} sx={{ px: 1.75, py: 0.75, borderRadius: 1.5, gap: 1, fontSize: '0.875rem', fontWeight: 600, color: tab === k ? 'text.primary' : 'text.secondary', bgcolor: tab === k ? 'background.paper' : 'transparent', boxShadow: tab === k ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
              {t(`site.programs.tab.${k}`)}
              <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {k === 'ON' ? onSite.length : k === 'HIDDEN' ? sorted.length - onSite.length : sorted.length}
              </Box>
            </ButtonBase>
          ))}
        </Stack>
        <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('site.programs.search')} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} sx={{ width: { xs: '100%', md: 260 } }} />
      </Stack>
      <Card>
        <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID, gap: 2, px: 2.5, py: 1.25, borderBottom: 1, borderColor: 'divider', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
          <span>#</span>
          <span>{t('site.programs.col.program')}</span>
          <span>{t('site.programs.col.grades')}</span>
          <span>{t('site.programs.col.onSite')}</span>
          <span />
        </Box>
        {shown.length === 0 && <Typography sx={{ p: 3, color: 'text.secondary' }}>{t('site.programs.empty')}</Typography>}
        {first.map(row)}
        {first.length > 0 && rest.length > 0 && (
          <Stack direction="row" sx={{ px: 2.5, py: 1, bgcolor: 'action.hover', alignItems: 'center', justifyContent: 'space-between', gap: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <VisibilityOffOutlinedIcon sx={{ fontSize: 16 }} />
              {t('site.programs.notOnHome')}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {t('site.programs.notOnHomeHint')}
            </Typography>
          </Stack>
        )}
        {rest.map(row)}
      </Card>

      {drawer && (
        <ProgramDrawer
          key={drawer.program?.id ?? 'new'}
          program={drawer.program}
          position={drawer.program ? onSite.indexOf(drawer.program) + 1 || null : null}
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Typography sx={{ fontSize: '0.875rem' }}>
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {label}:{' '}
      </Box>
      {value}
    </Typography>
  );
}

ProgramsPage.getLayout = layoutFor('ADMIN');
export default ProgramsPage;
