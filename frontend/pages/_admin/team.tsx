import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Avatar, Box, Button, Card, Stack, Typography } from '@mui/material';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import { useTranslation } from 'next-i18next/pages';
import { REORDER_SITE_PEOPLE, SET_SITE_PERSON_VISIBLE } from '@/apollo/admin/mutation';
import { ADMIN_SITE_PEOPLE } from '@/apollo/admin/query';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { type AdminPerson, PersonDrawer } from '@/libs/components/admin/site/PersonDrawer';
import { SiteSwitch, useReorder } from '@/libs/components/admin/site/shared';
import { layoutFor } from '@/libs/components/layout';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['admin', 'teacher']);

const initials = (p: AdminPerson) => `${p.firstName.replace('Dr. ', '')[0] ?? ''}${p.lastName[0] ?? ''}`;

/**
 * Stitch "Campusly Admin — Website: Our team": the director's card (64 px portrait, role, quote,
 * Edit) and a simple list (drag handle, 40 px photo, name, role, note or "Hidden from site",
 * on-site switch, Edit). Drag to reorder; the director always comes first on the site.
 */
const TeamPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const { data, refetch } = useQuery(ADMIN_SITE_PEOPLE, { fetchPolicy: 'cache-and-network' });
  const [setVisible] = useMutation(SET_SITE_PERSON_VISIBLE);
  const [reorder] = useMutation(REORDER_SITE_PEOPLE);
  const [drawer, setDrawer] = useState<{ person: AdminPerson | null } | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);

  const people = data?.adminSitePeople ?? [];
  const byId = new Map(people.map((p) => [p.id, p]));
  const sorted = (order ?? people.map((p) => p.id)).map((id) => byId.get(id)).filter((p) => !!p);
  const director = sorted.find((p) => p.isDirector);
  const others = sorted.filter((p) => !p.isDirector);

  const drag = useReorder(
    others.map((p) => p.id),
    (next) => {
      const ids = [...(director ? [director.id] : []), ...next];
      setOrder(ids);
      void reorder({ variables: { ids } }).finally(() => void refetch().then(() => setOrder(null)));
    },
  );
  const photo = (p: AdminPerson, size: number) => (
    <Avatar src={p.photoUrl ?? undefined} alt="" sx={{ width: size, height: size, bgcolor: 'primary.main', fontSize: size / 2.6 }}>
      {initials(p)}
    </Avatar>
  );

  return (
    <>
      <PageHeader
        title={t('site.team.pageTitle')}
        subtitle={t('site.team.pageSubtitle')}
        actions={
          <>
            <Button variant="outlined" color="inherit" endIcon={<NorthEastRoundedIcon />} href="/#team" target="_blank">
              {t('site.previewOnSite')}
            </Button>
            <Button variant="contained" disableElevation startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => setDrawer({ person: null })}>
              {t('site.team.add')}
            </Button>
          </>
        }
      />

      {director && (
        <Card sx={{ p: 2.5, mb: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
            {photo(director, 64)}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700 }}>
                  {director.firstName} {director.lastName}
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', color: 'primary.main', fontWeight: 600 }}>{director.role.en}</Typography>
              </Stack>
              {director.note && <Typography sx={{ mt: 0.5, fontSize: '0.875rem', fontStyle: 'italic', color: 'text.secondary' }}>“{director.note.en}”</Typography>}
            </Box>
            <Button variant="outlined" color="inherit" onClick={() => setDrawer({ person: director })}>
              {t('site.edit')}
            </Button>
          </Stack>
        </Card>
      )}

      <Card>
        {others.length === 0 && <Typography sx={{ p: 3, color: 'text.secondary' }}>{t('site.team.empty')}</Typography>}
        {others.map((p) => (
          <Stack key={p.id} direction="row" {...drag.rowProps(p.id)} sx={{ alignItems: 'center', gap: 1.5, px: 2.5, minHeight: 60, py: 1, borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 }, opacity: drag.dragging === p.id ? 0.5 : 1 }}>
            {drag.handle(p.id, t('site.dragToReorder'))}
            {photo(p, 40)}
            <Stack direction="row" sx={{ flex: 1, minWidth: 0, alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {p.firstName} {p.lastName}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{p.role.en}</Typography>
              {!p.showOnSite ? (
                <Typography sx={{ fontSize: '0.75rem', color: 'warning.dark', fontWeight: 600 }}>{t('site.team.hidden')}</Typography>
              ) : (
                p.note && <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>· {p.note.en}</Typography>
              )}
            </Stack>
            <SiteSwitch checked={p.showOnSite} label={t('site.team.onSiteSwitch', { name: `${p.firstName} ${p.lastName}` })} onToggle={(v) => setVisible({ variables: { id: p.id, showOnSite: v } }).then(() => refetch())} />
            <Button size="small" variant="outlined" color="inherit" onClick={() => setDrawer({ person: p })}>
              {t('site.edit')}
            </Button>
          </Stack>
        ))}
      </Card>

      {drawer && (
        <PersonDrawer
          key={drawer.person?.id ?? 'new'}
          person={drawer.person}
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

TeamPage.getLayout = layoutFor('ADMIN');
export default TeamPage;
