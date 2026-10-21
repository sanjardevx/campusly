import { useState, type ReactNode } from 'react';
import { IconButton, InputAdornment } from '@mui/material';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from 'next-i18next/pages';
import { FormField } from './FormField';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string;
  action?: ReactNode;
  error?: string | null;
}

/** Password field with the eye button of the Stitch screens */
export function PasswordInput({ id, label, value, onChange, autoComplete, placeholder, action, error }: Props) {
  const { t } = useTranslation('auth');
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      id={id}
      label={label}
      action={action}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      placeholder={placeholder}
      error={!!error}
      helperText={error ?? undefined}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                aria-label={visible ? t('signIn.hidePassword') : t('signIn.showPassword')}
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? (
                  <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} />
                ) : (
                  <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
