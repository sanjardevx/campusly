import { createTheme, type Shadows } from '@mui/material/styles';
import { Plus_Jakarta_Sans } from 'next/font/google';

/**
 * Design tokens from the Stitch project "Campusly K-12 LMS Dashboard" (design system
 * "Academic Editorial Calm", DECISIONS §13). Change them there first, then here.
 */
export const tokens = {
  primary: '#1F4E43', // deep spruce: brand, active navigation, primary buttons
  primaryHover: '#163830',
  primaryTint: '#E8EFEA', // active filter / selected row wash
  secondary: '#3E6B5C', // forest sage: progress, category pills, focus ring, hover borders
  accent: '#B45309', // ochre: ONLY time-sensitive notices (deadline < 24 h, closing windows)
  accentText: '#9A3412',
  accentTint: '#FEF7EE',
  success: '#1B633E',
  successTint: '#F0F6F2',
  info: '#5C625E', // inactive / informational
  infoTint: '#F1F2F0',
  error: '#BA1A1A',
  errorTint: '#FFDAD6',
  background: '#F8F8F6', // chalk canvas
  surface: '#FFFFFF', // cards, sheets
  recessed: '#F1F2EE', // rubric tables, side panels inside a card
  border: '#E3E5DF', // card and section rules
  divider: '#ECEEE8', // rules inside a card
  inputBorder: '#D1D5CB',
  text: '#242A27', // charcoal pine, never pure black
  textSecondary: '#5C625E',
} as const;

// Elevation from the design guide: borders first, shadows only as a faint trace
const layer1 = '0px 1px 3px rgba(36, 42, 39, 0.04)'; // cards
const layer2 = '0px 4px 12px -2px rgba(36, 42, 39, 0.08)'; // hover, menus
const layer3 = '0px 12px 32px -4px rgba(36, 42, 39, 0.12)'; // dialogs
const shadows = Array.from({ length: 25 }, (_, i) =>
  i === 0 ? 'none' : i <= 3 ? layer1 : i <= 12 ? layer2 : layer3,
) as Shadows;

// next/font downloads the font at build time and serves it from our own domain: no request to
// Google from the browser and no layout jump while it loads. Plus Jakarta Sans has no Hangul and
// no basic Cyrillic, so Korean and Russian text falls back to the system fonts below.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const fontFamily = [
  jakarta.style.fontFamily,
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  '"Apple SD Gothic Neo"',
  '"Noto Sans KR"',
  'Roboto',
  'sans-serif',
].join(',');

export const theme = createTheme({
  palette: {
    primary: {
      main: tokens.primary,
      dark: tokens.primaryHover,
      light: tokens.primaryTint,
      contrastText: '#FFFFFF',
    },
    secondary: { main: tokens.secondary, contrastText: '#FFFFFF' },
    // Ochre = "warning" in MUI terms: deadlines and closing windows
    warning: {
      main: tokens.accent,
      dark: tokens.accentText,
      light: tokens.accentTint,
    },
    success: { main: tokens.success, light: tokens.successTint },
    info: { main: tokens.info, light: tokens.infoTint },
    error: { main: tokens.error, light: tokens.errorTint },
    background: { default: tokens.background, paper: tokens.surface },
    text: { primary: tokens.text, secondary: tokens.textSecondary },
    divider: tokens.border,
  },
  // Type scale of the design guide (display → label-sm)
  typography: {
    fontFamily,
    h1: { fontSize: '2.5rem', fontWeight: 600, lineHeight: '3rem', letterSpacing: '-0.025em' },
    h2: { fontSize: '2rem', fontWeight: 600, lineHeight: '2.5rem', letterSpacing: '-0.02em' },
    h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: '2rem', letterSpacing: '-0.015em' },
    h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: '1.75rem', letterSpacing: '-0.01em' },
    h5: { fontSize: '1.125rem', fontWeight: 500, lineHeight: '1.625rem', letterSpacing: '-0.005em' },
    h6: { fontSize: '1rem', fontWeight: 500, lineHeight: '1.5rem' },
    body1: { fontSize: '0.9375rem', lineHeight: '1.5rem' },
    body2: { fontSize: '0.84375rem', lineHeight: '1.375rem', letterSpacing: '0.005em' },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: '1.125rem', letterSpacing: '0.01em' },
    caption: { fontSize: '0.75rem', fontWeight: 600, lineHeight: '1rem', letterSpacing: '0.02em' },
    button: { fontSize: '0.875rem', fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 8 },
  shadows,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Grades, scores, dates and times line up in columns (design guide: mandatory)
        body: { fontVariantNumeric: 'tabular-nums' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8 },
        // Secondary / ghost button: neutral border and text
        outlined: {
          borderColor: tokens.inputBorder,
          color: tokens.text,
          '&:hover': { borderColor: tokens.inputBorder, backgroundColor: '#EFF1EB' },
        },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderRadius: 16,
          borderColor: tokens.border,
          boxShadow: layer1,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        // 1.5rem on desktop, 1rem on phones
        root: ({ theme: t }) => ({
          padding: '1rem',
          [t.breakpoints.up('md')]: { padding: '1.5rem' },
          '&:last-child': { paddingBottom: undefined },
        }),
      },
    },
    MuiPaper: { styleOverrides: { outlined: { borderColor: tokens.border } } },
    MuiDivider: { styleOverrides: { root: { borderColor: tokens.divider } } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.surface,
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.inputBorder },
          // Active: spruce border, no glow
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: tokens.primary,
            borderWidth: 1,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        // Status chips: pill, 24 px, label-sm
        root: { height: 24, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.02em' },
      },
    },
    MuiAppBar: {
      defaultProps: { color: 'inherit', elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: tokens.surface,
          borderBottom: `1px solid ${tokens.border}`,
        },
      },
    },
  },
});
