import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { useTranslation } from 'next-i18next/pages';
import { ARCHIVE_SITE_PERSON, SAVE_SITE_PERSON } from '@/apollo/admin/mutation';
import { ConfirmDialog } from '@/libs/components/admin/ConfirmDialog';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { errorCode } from '@/libs/errors';
import type { AdminSitePeopleQuery } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { ImagePicker, type ImageValue, LangTabs, LocalizedField, type SiteLang, emptyL, fromL, imageInput, toL } from './shared';

export type AdminPerson = AdminSitePeopleQuery['adminSitePeople'][number];

/**
 * Stitch "Campusly Admin — Website: Add Person Drawer": photo, first / last name, role or
 * subject, "this is the school director", note (the director's quote), "Show on the website".
 * Role and note in four languages; names are not translated. Editing adds "Archive".
 */
export function PersonDrawer({ person, onClose, onSaved }: { person: AdminPerson | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const [lang, setLang] = useState<SiteLang>('en');
  const [firstName, setFirstName] = useState(person?.firstName ?? '');
  const [lastName, setLastName] = useState(person?.lastName ?? '');
  const [role, setRole] = useState(() => toL(person?.role));
  const [note, setNote] = useState(() => (person?.note ? toL(person.note) : emptyL()));
  const [isDirector, setIsDirector] = useState(person?.isDirector ?? false);
  const [showOnSite, setShowOnSite] = useState(person?.showOnSite ?? true);
  const [photo, setPhoto] = useState<ImageValue>({ previewUrl: person?.photoUrl ?? null });
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [save, { loading }] = useMutation(SAVE_SITE_PERSON);
  const [archive, { loading: archiving }] = useMutation(ARCHIVE_SITE_PERSON);

  const valid = firstName.trim() && lastName.trim() && role.en.trim();
  const submit = async () => {
    setError(null);
    try {
      await save({
        variables: {
          input: {
            id: person?.id,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            role: fromL(role)!,
            note: fromL(note),
            isDirector,
            showOnSite,
            ...imageInput(photo, { asset: 'photoAssetId', remove: 'removePhoto' }),
          },
        },
      });
      onSaved();
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  return (
    <>
      <SideDrawer
        open
        title={person ? t('site.team.edit') : t('site.team.add')}
        closeLabel={t('site.close')}
        onClose={onClose}
        footer={
          <>
            {person && (
              <Button color="error" startIcon={<Inventory2OutlinedIcon />} onClick={() => setConfirmArchive(true)}>
                {t('site.archive')}
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button color="inherit" onClick={onClose}>
              {t('site.cancel')}
            </Button>
            <Button variant="contained" disableElevation onClick={() => void submit()} disabled={!valid || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {t('site.save')}
            </Button>
          </>
        }
      >
        <LangTabs
          lang={lang}
          onLang={setLang}
          fields={[role, note]}
          onTranslated={([a, b]) => {
            setRole(a);
            setNote(b);
          }}
        />
        <DrawerSection title={t('site.team.person')}>
          <ImagePicker label={t('site.team.photo')} value={photo} onChange={setPhoto} shape="round" hint={t('site.team.photoHint')} />
          <Stack direction="row" spacing={1.5}>
            <TextField id="person-first" label={t('site.team.firstName')} placeholder="Gulnora" value={firstName} onChange={(e) => setFirstName(e.target.value)} size="small" required fullWidth slotProps={{ htmlInput: { maxLength: 60 } }} />
            <TextField id="person-last" label={t('site.team.lastName')} placeholder="Azimova" value={lastName} onChange={(e) => setLastName(e.target.value)} size="small" required fullWidth slotProps={{ htmlInput: { maxLength: 60 } }} />
          </Stack>
          <LocalizedField id="person-role" label={t('site.team.role')} value={role} onChange={setRole} lang={lang} max={80} required helper={t('site.team.roleHint')} />
          <FormControlLabel control={<Checkbox checked={isDirector} onChange={(e) => setIsDirector(e.target.checked)} />} label={<Typography variant="body2">{t('site.team.director')}</Typography>} />
          <LocalizedField id="person-note" label={t('site.team.note')} value={note} onChange={setNote} lang={lang} max={120} rows={2} helper={t('site.team.noteHint')} />
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider' }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('site.showOnSite')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t('site.team.showHint')}
              </Typography>
            </Box>
            <Switch checked={showOnSite} onChange={(e) => setShowOnSite(e.target.checked)} slotProps={{ input: { 'aria-label': t('site.showOnSite') } }} />
          </Stack>
        </DrawerSection>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </SideDrawer>
      <ConfirmDialog
        open={confirmArchive}
        title={t('site.team.archiveTitle')}
        body={t('site.team.archiveBody')}
        confirmLabel={t('site.archive')}
        danger
        busy={archiving}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() =>
          void archive({ variables: { id: person!.id } }).then(() => {
            setConfirmArchive(false);
            onSaved();
          })
        }
      />
    </>
  );
}
