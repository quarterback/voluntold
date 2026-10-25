// The look: a quiet SaaS dashboard for coordinators, and a clean consumer page
// for volunteers. Neutral surfaces with thin borders, one accent, labels above
// fields. MUI supplies the components (decision 0009).
//
// The accent keeps the hue of the original seed, #00B8A9, darkened so text and
// buttons meet 4.5:1 contrast on white.

import { createTheme, type Theme } from '@mui/material/styles';

export const SEED = '#00B8A9';

const light = {
  bg: '#F6F8FA',
  surface: '#FFFFFF',
  subtle: '#F9FAFB',
  border: '#E3E8EE',
  borderStrong: '#C9D1DA',
  text: '#1A1F36',
  text2: '#5B6474',
  text3: '#8792A2',
  accent: '#0E7C74',
  accentHover: '#0A665F',
  accentSoft: '#E6F5F3',
  onAccent: '#FFFFFF',
  success: '#1D7A3E',
  successSoft: '#E7F5EC',
  warning: '#8A5300',
  warningSoft: '#FFF3DC',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  info: '#2B59C3',
  infoSoft: '#EAF0FC',
  shadow: '0 1px 2px rgba(26, 31, 54, 0.06)',
  shadowPop: '0 12px 32px rgba(26, 31, 54, 0.14), 0 2px 6px rgba(26, 31, 54, 0.08)',
};

const dark: typeof light = {
  bg: '#0E1217',
  surface: '#151B22',
  subtle: '#1A2129',
  border: '#28313C',
  borderStrong: '#3A4552',
  text: '#E7EBF0',
  text2: '#A4AEBB',
  text3: '#6F7A88',
  accent: '#3CC9BA',
  accentHover: '#5ED6C9',
  accentSoft: '#12312E',
  onAccent: '#04201D',
  success: '#5BC782',
  successSoft: '#123222',
  warning: '#E9B05C',
  warningSoft: '#33260F',
  danger: '#F2867C',
  dangerSoft: '#3A1714',
  info: '#8AA9F5',
  infoSoft: '#16233F',
  shadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
  shadowPop: '0 12px 32px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.4)',
};

export type Tokens = typeof light;

declare module '@mui/material/styles' {
  interface Theme {
    vt: Tokens;
  }
  interface ThemeOptions {
    vt?: Tokens;
  }
}

export function makeTheme(isDark: boolean): Theme {
  const t = isDark ? dark : light;
  const focusRing = `0 0 0 3px ${t.accentSoft}`;
  return createTheme({
    vt: t,
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { main: t.accent, dark: t.accentHover, contrastText: t.onAccent },
      secondary: { main: t.text2 },
      success: { main: t.success },
      warning: { main: t.warning },
      error: { main: t.danger },
      info: { main: t.info },
      background: { default: t.bg, paper: t.surface },
      text: { primary: t.text, secondary: t.text2, disabled: t.text3 },
      divider: t.border,
      action: { hover: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(26,31,54,0.04)' },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: 14,
      h1: { fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.3 },
      h2: { fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.4 },
      h3: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 },
      body1: { fontSize: '0.875rem', lineHeight: 1.5 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', color: t.text3 },
      button: { textTransform: 'none', fontWeight: 500, fontSize: '0.875rem', letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: t.bg, WebkitFontSmoothing: 'antialiased', fontFeatureSettings: '"cv11", "ss01"' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 6, minHeight: 34, paddingInline: 14, whiteSpace: 'nowrap' },
          sizeSmall: { minHeight: 28, paddingInline: 10, fontSize: '0.8125rem' },
          sizeLarge: { minHeight: 44, fontSize: '0.9375rem', borderRadius: 8 },
          contained: { boxShadow: t.shadow, '&:hover': { boxShadow: t.shadow } },
          outlined: {
            borderColor: t.borderStrong,
            color: t.text,
            backgroundColor: t.surface,
            boxShadow: t.shadow,
            '&:hover': { borderColor: t.borderStrong, backgroundColor: t.subtle },
          },
          text: { paddingInline: 8 },
        },
        variants: [{ props: { variant: 'outlined', color: 'error' }, style: { color: t.danger } }],
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 6, color: t.text2 } } },
      // Labels sit above fields, as in most SaaS forms.
      MuiInputLabel: {
        defaultProps: { shrink: true },
        styleOverrides: {
          root: {
            position: 'relative',
            transform: 'none',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: t.text,
            marginBottom: 6,
            '&.Mui-focused': { color: t.text },
            '&.Mui-error': { color: t.danger },
          },
          asterisk: { color: t.text3 },
        },
      },
      MuiOutlinedInput: {
        defaultProps: { notched: false },
        styleOverrides: {
          root: {
            borderRadius: 6,
            backgroundColor: t.surface,
            boxShadow: t.shadow,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: t.borderStrong, top: 0 },
            '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.text3 },
            '&.Mui-focused': { boxShadow: focusRing },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.accent, borderWidth: 1 },
            '&.Mui-disabled': { backgroundColor: t.subtle },
          },
          input: { padding: '8px 12px', fontSize: '0.875rem', '&::placeholder': { color: t.text3, opacity: 1 } },
          multiline: { padding: 0 },
        },
      },
      MuiSelect: { defaultProps: { size: 'small' }, styleOverrides: { select: { padding: '8px 12px', minHeight: 'unset' } } },
      MuiTextField: { defaultProps: { fullWidth: true, size: 'small' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiFormHelperText: { styleOverrides: { root: { marginInline: 0, marginTop: 4, fontSize: '0.75rem', color: t.text2 } } },
      MuiFormControlLabel: { styleOverrides: { label: { fontSize: '0.875rem' } } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundColor: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, boxShadow: t.shadow } },
      },
      MuiCardContent: { styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } } },
      MuiCardActionArea: { styleOverrides: { root: { '&:hover .MuiCardActionArea-focusHighlight': { opacity: 0.02 } } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiMenu: { styleOverrides: { paper: { border: `1px solid ${t.border}`, boxShadow: t.shadowPop, marginTop: 4 } } },
      MuiMenuItem: { styleOverrides: { root: { fontSize: '0.875rem', minHeight: 34 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 12, boxShadow: t.shadowPop, backgroundColor: t.surface } } },
      MuiDialogTitle: { styleOverrides: { root: { fontSize: '1rem', fontWeight: 600, padding: '20px 24px 8px' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '12px 24px 20px', gap: 8 } } },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontWeight: 500, fontSize: '0.75rem', height: 24, backgroundColor: t.subtle, border: `1px solid ${t.border}` },
          outlined: { backgroundColor: t.surface },
          colorPrimary: { backgroundColor: t.accentSoft, color: t.accent, borderColor: 'transparent' },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: { root: { backgroundColor: t.surface, borderBottom: `1px solid ${t.border}` } },
      },
      MuiToolbar: { styleOverrides: { root: { minHeight: 56, '@media (min-width:600px)': { minHeight: 56 } } } },
      MuiBottomNavigation: { styleOverrides: { root: { backgroundColor: t.surface, borderTop: `1px solid ${t.border}`, height: 60 } } },
      MuiBottomNavigationAction: {
        styleOverrides: { root: { color: t.text3, '&.Mui-selected': { color: t.accent } }, label: { fontSize: '0.75rem', '&.Mui-selected': { fontSize: '0.75rem' } } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none', fontSize: '0.8125rem', paddingBlock: 5, paddingInline: 12, color: t.text2, borderColor: t.borderStrong,
            '&.Mui-selected': { backgroundColor: t.accentSoft, color: t.accent, '&:hover': { backgroundColor: t.accentSoft } },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8, fontSize: '0.8125rem', alignItems: 'center', paddingBlock: 2 },
        },
        variants: [
          { props: { severity: 'success' }, style: { backgroundColor: t.successSoft, color: t.success } },
          { props: { severity: 'info' }, style: { backgroundColor: t.infoSoft, color: t.info } },
          { props: { severity: 'warning' }, style: { backgroundColor: t.warningSoft, color: t.warning } },
          { props: { severity: 'error' }, style: { backgroundColor: t.dangerSoft, color: t.danger } },
        ],
      },
      MuiLinearProgress: {
        styleOverrides: { root: { height: 6, borderRadius: 3, backgroundColor: t.border }, bar: { borderRadius: 3 } },
      },
      MuiList: { defaultProps: { dense: true } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 6 } } },
      MuiListItemText: { styleOverrides: { primary: { fontSize: '0.875rem', fontWeight: 500 }, secondary: { fontSize: '0.8125rem' } } },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: t.border, fontSize: '0.8125rem', paddingBlock: 10 },
          head: { color: t.text2, fontWeight: 500, backgroundColor: t.subtle, fontSize: '0.75rem' },
        },
      },
      MuiSwitch: { defaultProps: { size: 'small' } },
      MuiDivider: { styleOverrides: { root: { borderColor: t.border } } },
      MuiSnackbar: { defaultProps: { anchorOrigin: { vertical: 'bottom', horizontal: 'center' } } },
    },
  });
}
