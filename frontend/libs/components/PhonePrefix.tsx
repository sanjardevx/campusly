import { Box } from '@mui/material';

/** "+998" in its own grey block at the start of a phone field (Stitch: sign-in, Add student) */
export function PhonePrefix() {
  return (
    <Box
      component="span"
      sx={{
        alignSelf: 'stretch',
        display: 'flex',
        alignItems: 'center',
        ml: '-14px',
        mr: 1.5,
        px: 1.75,
        bgcolor: '#EFEEEA',
        borderRight: '1px solid',
        borderColor: 'divider',
        borderTopLeftRadius: 'inherit',
        borderBottomLeftRadius: 'inherit',
        color: 'text.secondary',
        fontWeight: 600,
        fontSize: '0.875rem',
      }}
    >
      +998
    </Box>
  );
}
