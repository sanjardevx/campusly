import { useQuery } from '@apollo/client/react';
import { Autocomplete, Avatar, Box, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { TEACHERS } from '@/apollo/admin/query';

/**
 * Stitch teacher dropdown: initials, name, and under it the title and how many courses the teacher
 * already has (instead of Stitch's "lessons/week": there is no timetable in Campusly).
 */
export function TeacherPicker({
  id,
  value,
  exclude = [],
  courseCount,
  error,
  onChange,
}: {
  id: string;
  value: string | null;
  exclude?: string[];
  courseCount: (teacherId: string) => number;
  error?: string;
  onChange: (teacherId: string | null) => void;
}) {
  const { t } = useTranslation('admin');
  const teachers = (useQuery(TEACHERS).data?.users.list ?? []).filter((x) => !exclude.includes(x.id));
  const meta = (x: (typeof teachers)[number]) =>
    [x.title, t('classes.nCourses', { count: courseCount(x.id) })].filter(Boolean).join(' · ');
  const initials = (x: { firstName: string; lastName: string }) => `${x.firstName[0] ?? ''}${x.lastName[0] ?? ''}`.toUpperCase();

  return (
    <Autocomplete
      id={id}
      options={teachers}
      value={teachers.find((x) => x.id === value) ?? null}
      onChange={(_, x) => onChange(x?.id ?? null)}
      getOptionLabel={(x) => `${x.firstName} ${x.lastName}`}
      renderOption={({ key, ...props }, x, { selected }) => (
        <Box component="li" key={key} {...props} sx={{ gap: 1.5 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              fontSize: '0.75rem',
              fontWeight: 600,
              bgcolor: selected ? 'primary.main' : 'action.hover',
              color: selected ? 'primary.contrastText' : 'text.secondary',
            }}
          >
            {initials(x)}
          </Avatar>
          <Stack>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {x.firstName} {x.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
              {meta(x)}
            </Typography>
          </Stack>
        </Box>
      )}
      renderInput={(params) => (
        <TextField {...params} placeholder={t('classes.course.pickTeacher')} error={!!error} helperText={error} />
      )}
    />
  );
}
