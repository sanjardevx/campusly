import { MenuItem, TextField } from '@mui/material';

export interface Option {
  value: string;
  label: string;
}

/** The small select every Records filter uses */
export function Picker({
  label,
  value,
  options,
  onChange,
  width = 200,
}: {
  label: string;
  value: string | undefined;
  options: Option[];
  onChange: (value: string) => void;
  width?: number;
}) {
  return (
    <TextField
      select
      size="small"
      label={label}
      // An id that is not (or no longer) in the list shows as empty instead of warning
      value={options.some((o) => o.value === value) ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      sx={{ width: { xs: '100%', sm: width } }}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
