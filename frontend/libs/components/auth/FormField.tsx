import type { ReactNode } from 'react';
import { Box, Stack, TextField, type TextFieldProps, Typography } from '@mui/material';

type Props = Omit<TextFieldProps, 'label'> & {
  id: string;
  label: string;
  /** Right side of the label row, e.g. "Forgot password?" */
  action?: ReactNode;
};

/** Stitch form field: a small uppercase label ABOVE the input (not MUI's floating label) */
export function FormField({ id, label, action, ...props }: Props) {
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
        <Typography
          component="label"
          htmlFor={id}
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          {label}
        </Typography>
        {action}
      </Stack>
      <TextField id={id} {...props} />
    </Box>
  );
}
