import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Button, ButtonBase, CircularProgress, MenuItem, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { useTranslation } from 'next-i18next/pages';
import { ARCHIVE_SITE_PROGRAM, SAVE_SITE_PROGRAM } from '@/apollo/admin/mutation';
import { ADMIN_SITE_PEOPLE } from '@/apollo/admin/query';
import { ConfirmDialog } from '@/libs/components/admin/ConfirmDialog';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { errorCode } from '@/libs/errors';
import type { AdminSiteProgramsQuery, SiteProgramCategory } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { ImagePicker, type ImageValue, LangTabs, LocalizedField, type SiteLang, StatusPill, emptyL, fromL, imageInput, toL } from './shared';

export type AdminProgram = AdminSiteProgramsQuery['adminSitePrograms'][number];

export const CATEGORIES: SiteProgramCategory[] = ['LANGUAGE', 'SPORTS', 'IT', 'ARTS', 'READING', 'OTHER'];
export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const GRADES = Array.from({ length: 11 }, (_, i) => i + 1);
const YOUTUBE = /^https:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{6,}/;

const label = { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 } as const;

/**
 * Stitch "Campusly Admin — Website: Edit Program Drawer": category, name, media (photo or a short
 * video — a YouTube link here; MP4 upload is in the backlog), grades and level, schedule (days,
 * times, room), up to two teachers from "Our team", short description, "Show on the website" and
 * a preview of the home page card. "Archive" replaces Stitch's "Delete".
 */
export function ProgramDrawer({ program, position, onClose, onSaved }: { program: AdminProgram | null; position: number | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const people = useQuery(ADMIN_SITE_PEOPLE).data?.adminSitePeople ?? [];
  const [lang, setLang] = useState<SiteLang>('en');
  const [category, setCategory] = useState<SiteProgramCategory>(program?.category ?? 'LANGUAGE');
  const [name, setName] = useState(() => toL(program?.name));
  const [levelNote, setLevelNote] = useState(() => (program?.levelNote ? toL(program.levelNote) : emptyL()));
  const [description, setDescription] = useState(() => toL(program?.description));
  const [media, setMedia] = useState<'PHOTO' | 'VIDEO'>(program?.videoUrl ? 'VIDEO' : 'PHOTO');
  const [photo, setPhoto] = useState<ImageValue>({ previewUrl: program?.photoUrl ?? null });
  const [videoUrl, setVideoUrl] = useState(program?.videoUrl ?? '');
  const [gradeFrom, setGradeFrom] = useState(program?.gradeFrom ?? 1);
  const [gradeTo, setGradeTo] = useState(program?.gradeTo ?? 11);
  const [days, setDays] = useState<string[]>(program?.days ?? []);
  const [startTime, setStartTime] = useState(program?.startTime ?? '');
  const [endTime, setEndTime] = useState(program?.endTime ?? '');
  const [room, setRoom] = useState(program?.room ?? '');
  const [teacherIds, setTeacherIds] = useState<string[]>(program?.teachers.map((x) => x.id) ?? []);
  const [showOnSite, setShowOnSite] = useState(program?.showOnSite ?? true);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [save, { loading }] = useMutation(SAVE_SITE_PROGRAM);
  const [archive, { loading: archiving }] = useMutation(ARCHIVE_SITE_PROGRAM);

  const videoBad = media === 'VIDEO' && !!videoUrl.trim() && !YOUTUBE.test(videoUrl.trim());
  const valid = name.en.trim() && description.en.trim() && gradeTo >= gradeFrom && !videoBad && (!startTime || !endTime || endTime > startTime);

  const submit = async () => {
    setError(null);
    try {
      await save({
        variables: {
          input: {
            id: program?.id,
            category,
            name: fromL(name)!,
            gradeFrom,
            gradeTo,
            levelNote: fromL(levelNote),
            days,
            startTime: startTime || null,
            endTime: endTime || null,
            room: room.trim() || null,
            teacherIds,
            description: fromL(description)!,
            videoUrl: media === 'VIDEO' ? videoUrl.trim() : '',
            showOnSite,
            ...(media === 'PHOTO' ? imageInput(photo, { asset: 'photoAssetId', remove: 'removePhoto' }) : {}),
          },
        },
      });
      onSaved();
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  const dayNames = days.map((d) => t(`site.programs.day.${d}`)).join(', ');
  const levelText = levelNote[lang] || levelNote.en;

  return (
    <>
      <SideDrawer
        open
        title={program ? t('site.programs.edit') : t('site.programs.new')}
        closeLabel={t('site.close')}
        onClose={onClose}
        footer={
          <>
            {program && (
              <Button color="error" startIcon={<Inventory2OutlinedIcon />} onClick={() => setConfirmArchive(true)}>
                {t('site.archive')}
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button color="inherit" onClick={onClose}>
              {t('site.cancel')}
            </Button>
            <Button variant="contained" disableElevation onClick={() => void submit()} disabled={!valid || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckRoundedIcon />}>
              {program ? t('site.saveChanges') : t('site.create')}
            </Button>
          </>
        }
      >
        {program && (
          <Box sx={{ mt: -1, mb: 2 }}>
            <StatusPill tone={program.showOnSite ? 'green' : 'grey'}>{program.showOnSite ? t('site.programs.onSiteN', { n: position ?? program.order }) : t('site.programs.hidden')}</StatusPill>
          </Box>
        )}
        <LangTabs
          lang={lang}
          onLang={setLang}
          fields={[name, levelNote, description]}
          onTranslated={([a, b, c]) => {
            setName(a);
            setLevelNote(b);
            setDescription(c);
          }}
        />

        <DrawerSection title={t('site.programs.basics')}>
          <Box>
            <Typography sx={label}>{t('site.programs.category')}</Typography>
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              {CATEGORIES.map((c) => (
                <ButtonBase key={c} onClick={() => setCategory(c)} aria-pressed={category === c} sx={{ px: 1.5, py: 0.5, borderRadius: 999, border: 1, fontSize: '0.8125rem', fontWeight: 600, borderColor: category === c ? 'primary.main' : 'divider', bgcolor: category === c ? 'primary.main' : 'transparent', color: category === c ? '#fff' : 'text.secondary' }}>
                  {t(`site.programs.cat.${c}`)}
                </ButtonBase>
              ))}
            </Stack>
          </Box>
          <LocalizedField id="program-name" label={t('site.programs.name')} value={name} onChange={setName} lang={lang} max={100} required />
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ ...label, mb: 0 }}>{t('site.programs.media')}</Typography>
              <ToggleButtonGroup exclusive size="small" value={media} onChange={(_, v: 'PHOTO' | 'VIDEO' | null) => v && setMedia(v)}>
                <ToggleButton value="PHOTO">{t('site.programs.photo')}</ToggleButton>
                <ToggleButton value="VIDEO">{t('site.programs.video')}</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {media === 'PHOTO' ? (
              <ImagePicker label="" value={photo} onChange={setPhoto} shape="card" hint={t('site.programs.photoHint')} />
            ) : (
              <TextField id="program-video" fullWidth size="small" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" error={videoBad} helperText={videoBad ? t('site.programs.videoBad') : t('site.programs.videoHint')} />
            )}
          </Box>
        </DrawerSection>

        <DrawerSection title={t('site.programs.grades')}>
          <Stack direction="row" spacing={1.5}>
            <TextField select size="small" label={t('site.programs.from')} value={gradeFrom} onChange={(e) => setGradeFrom(Number(e.target.value))} sx={{ flex: 1 }}>
              {GRADES.map((g) => (
                <MenuItem key={g} value={g}>
                  {t('site.programs.grade', { n: g })}
                </MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label={t('site.programs.to')} value={gradeTo} onChange={(e) => setGradeTo(Number(e.target.value))} error={gradeTo < gradeFrom} sx={{ flex: 1 }}>
              {GRADES.map((g) => (
                <MenuItem key={g} value={g}>
                  {t('site.programs.grade', { n: g })}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <LocalizedField id="program-level" label={t('site.programs.levelNote')} value={levelNote} onChange={setLevelNote} lang={lang} max={60} />
        </DrawerSection>

        <DrawerSection title={t('site.programs.schedule')}>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {DAYS.map((d) => {
              const on = days.includes(d);
              return (
                <ButtonBase key={d} onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])} aria-pressed={on} sx={{ minWidth: 48, px: 1.25, py: 0.75, borderRadius: 2, border: 1, fontSize: '0.8125rem', fontWeight: 600, borderColor: on ? 'primary.main' : 'divider', bgcolor: on ? 'rgba(31,78,67,0.08)' : 'transparent', color: on ? 'primary.main' : 'text.secondary' }}>
                  {t(`site.programs.day.${d}`)}
                </ButtonBase>
              );
            })}
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField type="time" size="small" label={t('site.programs.start')} value={startTime} onChange={(e) => setStartTime(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
            <TextField type="time" size="small" label={t('site.programs.end')} value={endTime} onChange={(e) => setEndTime(e.target.value)} error={!!startTime && !!endTime && endTime <= startTime} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
            <TextField size="small" label={t('site.programs.room')} value={room} onChange={(e) => setRoom(e.target.value)} slotProps={{ htmlInput: { maxLength: 40 } }} sx={{ flex: 1 }} />
          </Stack>
        </DrawerSection>

        <DrawerSection title={t('site.programs.teacher')}>
          {teacherIds.map((id, i) => (
            <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField select size="small" fullWidth value={id} onChange={(e) => setTeacherIds(teacherIds.map((x, j) => (j === i ? e.target.value : x)))} aria-label={t('site.programs.teacher')}>
                {people
                  .filter((p) => p.id === id || !teacherIds.includes(p.id))
                  .map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} · {p.role.en}
                    </MenuItem>
                  ))}
              </TextField>
              <Button size="small" color="inherit" onClick={() => setTeacherIds(teacherIds.filter((_, j) => j !== i))} aria-label={t('site.programs.removeTeacher')} sx={{ minWidth: 0 }}>
                <CloseRoundedIcon fontSize="small" />
              </Button>
            </Stack>
          ))}
          {teacherIds.length < 2 && people.some((p) => !teacherIds.includes(p.id)) && (
            <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setTeacherIds([...teacherIds, people.find((p) => !teacherIds.includes(p.id))!.id])} sx={{ alignSelf: 'flex-start' }}>
              {teacherIds.length ? t('site.programs.addSecondTeacher') : t('site.programs.addTeacher')}
            </Button>
          )}
          {people.length === 0 && <Typography variant="body2" color="text.secondary">{t('site.programs.noTeam')}</Typography>}
        </DrawerSection>

        <DrawerSection title={t('site.programs.description')}>
          <LocalizedField id="program-description" label={t('site.programs.description')} value={description} onChange={setDescription} lang={lang} max={100} rows={2} required />
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('site.showOnSite')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t('site.programs.showHint')}
              </Typography>
            </Box>
            <Switch checked={showOnSite} onChange={(e) => setShowOnSite(e.target.checked)} slotProps={{ input: { 'aria-label': t('site.showOnSite') } }} />
          </Stack>
        </DrawerSection>

        <DrawerSection title={t('site.preview')}>
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            {t('site.programs.previewHint')}
          </Typography>
          <Stack direction="row" sx={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #E8E5DF', bgcolor: '#fff', height: 176 }}>
            <Box sx={{ width: '38%', bgcolor: 'action.hover', flexShrink: 0, position: 'relative' }}>
              {media === 'PHOTO' && photo.previewUrl && <Box component="img" src={photo.previewUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              <Box sx={{ position: 'absolute', top: 8, left: 8, px: 1, py: 0.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.92)', fontSize: '0.6875rem', fontWeight: 600 }}>{t(`site.programs.cat.${category}`)}</Box>
            </Box>
            <Stack sx={{ p: 2, justifyContent: 'space-between', minWidth: 0, flex: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>{name[lang] || name.en || t('site.programs.name')}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{[t('site.programs.grades2', { from: gradeFrom, to: gradeTo }), levelText].filter(Boolean).join(' · ')}</Typography>
                {days.length > 0 && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{[dayNames, startTime && endTime ? `${startTime}–${endTime}` : null].filter(Boolean).join(' · ')}</Typography>}
                <Typography noWrap sx={{ fontSize: '0.75rem', mt: 0.5 }}>{description[lang] || description.en}</Typography>
              </Box>
              <Stack direction="row" sx={{ justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, color: 'primary.main', fontSize: '0.75rem', fontWeight: 600 }}>
                {t('site.programs.askSchedule')}
                <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
              </Stack>
            </Stack>
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
        title={t('site.programs.archiveTitle')}
        body={t('site.programs.archiveBody')}
        confirmLabel={t('site.archive')}
        danger
        busy={archiving}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() =>
          void archive({ variables: { id: program!.id } }).then(() => {
            setConfirmArchive(false);
            onSaved();
          })
        }
      />
    </>
  );
}
