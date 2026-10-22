import { Avatar, Stack, Typography } from '@mui/material';

/** Stitch: "NK  Nilufar Karimova" — initials in a light circle, then the name */
export function TeacherName({ firstName, lastName, extra }: { firstName: string; lastName: string; extra?: number }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Avatar sx={{ width: 26, height: 26, fontSize: '0.6875rem', fontWeight: 600, bgcolor: 'action.hover', color: 'text.secondary' }}>
        {`${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()}
      </Avatar>
      <Typography variant="body2">
        {firstName} {lastName}
        {!!extra && (
          <Typography component="span" variant="body2" color="text.secondary">
            {' '}+{extra}
          </Typography>
        )}
      </Typography>
    </Stack>
  );
}
