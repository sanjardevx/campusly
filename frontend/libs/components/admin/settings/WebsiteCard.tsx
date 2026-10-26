import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { FormField } from '@/libs/components/auth/FormField';
import type { SchoolSettingsQuery } from '@/libs/gql/graphql';
import { SettingsCard } from './SettingsCard';
import { useSettingsSave } from './useSettingsSave';

type Settings = SchoolSettingsQuery['schoolSettings'];

const EMAIL = /^([^\s@]+@[^\s@]+\.[^\s@]+)?$/;
const INSTAGRAM = /^(https:\/\/(www\.)?instagram\.com\/[\w.]+\/?)?$/;
const YOUTUBE = /^(https:\/\/(www\.)?youtube\.com\/[\w@./-]+)?$/;

/** Public website footer and the numbers strip (day 19): address, metro, email, social links, founded */
export function WebsiteCard({ settings }: { settings: Settings }) {
  const { t } = useTranslation('admin');
  const initial = () => ({
    address: settings.siteAddress ?? '',
    metro: settings.siteMetro ?? '',
    email: settings.siteEmail ?? '',
    instagram: settings.instagramUrl ?? '',
    youtube: settings.youtubeUrl ?? '',
    founded: settings.foundedYear ? String(settings.foundedYear) : '',
  });
  const [form, setForm] = useState(initial);
  const { editing, busy, saved, error, save, onEdit, onCancel } = useSettingsSave(() => setForm(initial()));

  const year = form.founded ? Number(form.founded) : null;
  const bad = {
    email: !EMAIL.test(form.email.trim()),
    instagram: !INSTAGRAM.test(form.instagram.trim()),
    youtube: !YOUTUBE.test(form.youtube.trim()),
    founded: year !== null && !(Number.isInteger(year) && year >= 1900 && year <= 2100),
  };
  const valid = !Object.values(bad).some(Boolean);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial());

  const field = (key: keyof typeof form, extra: { placeholder?: string; type?: string; error?: boolean; helper?: string } = {}) => (
    <FormField
      id={`site-${key}`}
      label={t(`settings.website.${key}`)}
      value={form[key]}
      disabled={!editing}
      error={extra.error}
      helperText={extra.error ? t(`settings.website.${key}Bad`) : extra.helper}
      placeholder={extra.placeholder}
      type={extra.type}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      fullWidth
    />
  );

  return (
    <SettingsCard
      title={t('settings.website.title')}
      subtitle={t('settings.website.subtitle')}
      edit={{
        editing,
        onEdit,
        onCancel,
        dirty,
        valid,
        busy,
        saved,
        error,
        onSave: () =>
          void save({
            siteAddress: form.address,
            siteMetro: form.metro,
            siteEmail: form.email.trim(),
            instagramUrl: form.instagram.trim(),
            youtubeUrl: form.youtube.trim(),
            foundedYear: year ?? undefined,
          }),
      }}
    >
      <Stack spacing={2}>
        {field('address', { placeholder: '12 Academic Street, Chilanzar, Tashkent' })}
        {field('metro', { placeholder: 'Nearest metro: Chilanzar, 5 min walk' })}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: 2 }}>{field('email', { type: 'email', error: bad.email, placeholder: 'admissions@school.uz' })}</Box>
          <Box sx={{ flex: 1 }}>{field('founded', { type: 'number', error: bad.founded, placeholder: '2014' })}</Box>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>{field('instagram', { error: bad.instagram, placeholder: 'https://instagram.com/your_school' })}</Box>
          <Box sx={{ flex: 1 }}>{field('youtube', { error: bad.youtube, placeholder: 'https://youtube.com/@your_school' })}</Box>
        </Stack>
      </Stack>
    </SettingsCard>
  );
}
