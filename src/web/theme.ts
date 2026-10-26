// The look (decision 0011, spec section 11): the owner's type and color.
// PP Object Sans for headings and numbers, PP Neue Montreal for text. An ink
// sidebar, a cool lilac ground, ultramarine for actions, lime for "on" states
// and tangerine for things that need attention. Bold means clear: strong
// type, plain surfaces, color only where it carries meaning.
//
// Every color, font and radius lives here so the look can change in one place.
// Contrast checked against WCAG AA: accent on white 6.7:1, ink on lime 14.3:1,
// ink on tangerine 6.5:1, secondary text on white 8.9:1.

import { createTheme, type Theme } from '@mui/material/styles';

export const FONT_DISPLAY = '"Object Sans", "Neue Montreal", system-ui, sans-serif';
export const FONT_TEXT = '"Neue Montreal", system-ui, -apple-system, "Segoe UI", sans-serif';

const light = {
  bg: '#F1EEFF',
  surface: '#FFFFFF',
  subtle: '#F7F5FF',
  border: '#E2DEF7',
  borderStrong: '#C3BDE6',
  text: '#14112B',
  text2: '#4A4668',
  text3: '#625E85',
  accent: '#3D3BF3',
  accentHover: '#2B29D6',
  accentSoft: '#E4E3FE',
  onAccent: '#FFFFFF',
  ink: '#14112B',
  onInk: '#FFFFFF',
  onInk2: '#B6B1D6',
  lime: '#C6F432',
  onLime: '#14112B',
  tangerine: '#FF6B2C',
  onTangerine: '#14112B',
  success: '#3D5A00',
  successSoft: '#E9FBB5',
  warning: '#A63A06',
  warningSoft: '#FFE4D6',
  danger: '#C2281D',
  dangerSoft: '#FDE7E4',
  info: '#3D3BF3',
  infoSoft: '#E4E3FE',
  radius: 16,
  shadow: 'none',
  shadowPop: '0 16px 40px rgba(20, 17, 43, 0.18), 0 2px 6px rgba(20, 17, 43, 0.08)',
};

const dark: typeof light = {
  bg: '#0D0B1C',
  surface: '#17142C',
  subtle: '#1E1A38',
  border: '#2C2850',
  borderStrong: '#3F3A6A',
  text: '#F2F0FF',
  text2: '#B6B1D6',
  text3: '#8A85AD',
  accent: '#8F8DFF',
  accentHover: '#A9A7FF',
  accentSoft: '#23215A',
  onAccent: '#0D0B1C',
  ink: '#07061A',
  onInk: '#FFFFFF',
  onInk2: '#B6B1D6',
  lime: '#C6F432',
  onLime: '#14112B',
  tangerine: '#FF6B2C',
  onTangerine: '#14112B',
  success: '#C6F432',
  successSoft: '#26320A',
  warning: '#FF9A6B',
  warningSoft: '#3A1E10',
  danger: '#FF8A7E',
  dangerSoft: '#3A1714',
  info: '#8F8DFF',
  infoSoft: '#23215A',
  radius: 16,
  shadow: 'none',
  shadowPop: '0 16px 40px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4)',
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
  const display = { fontFamily: FONT_DISPLAY, fontWeight: 800 };
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
      action: { hover: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(61,59,243,0.06)' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: FONT_TEXT,
      fontSize: 15,
      h1: { ...display, fontSize: '2.25rem', letterSpacing: '-0.025em', lineHeight: 1.05 },
      h2: { ...display, fontSize: '1.125rem', letterSpacing: '-0.01em', lineHeight: 1.25 },
      h3: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.4 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.5 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      caption: { fontSize: '0.8125rem', color: t.text3 },
      button: { textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem', letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          @font-face { font-family: "Object Sans"; src: url(/fonts/PPObjectSans-Heavy.woff2) format("woff2"); font-weight: 800; font-style: normal; font-display: swap; }
          @font-face { font-family: "Object Sans"; src: url(/fonts/PPObjectSans-HeavySlanted.woff2) format("woff2"); font-weight: 800; font-style: italic; font-display: swap; }
          @font-face { font-family: "Neue Montreal"; src: url(/fonts/PPNeueMontreal-Book.woff2) format("woff2"); font-weight: 400; font-display: swap; }
          @font-face { font-family: "Neue Montreal"; src: url(/fonts/PPNeueMontreal-Medium.woff2) format("woff2"); font-weight: 500; font-display: swap; }
          @font-face { font-family: "Neue Montreal"; src: url(/fonts/PPNeueMontreal-Semibold.woff2) format("woff2"); font-weight: 600 700; font-display: swap; }
          body { background-color: ${t.bg}; -webkit-font-smoothing: antialiased; }
        `,
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 999, minHeight: 40, paddingInline: 18, whiteSpace: 'nowrap' },
          sizeSmall: { minHeight: 32, paddingInline: 12, fontSize: '0.8125rem' },
          sizeLarge: { minHeight: 52, fontSize: '1rem', paddingInline: 24 },
          outlined: {
            borderWidth: 2,
            borderColor: t.text,
            color: t.text,
            backgroundColor: 'transparent',
            '&:hover': { borderWidth: 2, borderColor: t.text, backgroundColor: t.subtle },
            '&.Mui-disabled': { borderWidth: 2 },
          },
          text: { paddingInline: 10 },
        },
        variants: [{ props: { variant: 'outlined', color: 'error' }, style: { color: t.danger, borderColor: t.danger } }],
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 999, color: t.text2 } } },
      MuiFab: { styleOverrides: { root: { boxShadow: t.shadowPop, textTransform: 'none', fontWeight: 600 } } },
      // Labels sit above fields.
      MuiInputLabel: {
        defaultProps: { shrink: true },
        styleOverrides: {
          root: {
            position: 'relative',
            transform: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
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
            borderRadius: 10,
            backgroundColor: t.surface,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: t.borderStrong, borderWidth: 1.5, top: 0 },
            '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.text2 },
            '&.Mui-focused': { boxShadow: focusRing },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.accent, borderWidth: 1.5 },
            '&.Mui-disabled': { backgroundColor: t.subtle },
          },
          input: { padding: '10px 14px', fontSize: '0.9375rem', '&::placeholder': { color: t.text3, opacity: 1 } },
          multiline: { padding: 0 },
        },
      },
      MuiSelect: { defaultProps: { size: 'small' }, styleOverrides: { select: { padding: '10px 14px', minHeight: 'unset' } } },
      MuiTextField: { defaultProps: { fullWidth: true, size: 'small' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiFormHelperText: { styleOverrides: { root: { marginInline: 0, marginTop: 4, fontSize: '0.8125rem', color: t.text2 } } },
      MuiFormControlLabel: { styleOverrides: { label: { fontSize: '0.9375rem' } } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundColor: t.surface, border: 'none', borderRadius: t.radius, boxShadow: 'none' } },
      },
      MuiCardContent: { styleOverrides: { root: { padding: 22, '&:last-child': { paddingBottom: 22 } } } },
      MuiCardActionArea: { styleOverrides: { root: { '&:hover .MuiCardActionArea-focusHighlight': { opacity: 0.04 } } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiMenu: { styleOverrides: { paper: { borderRadius: 14, boxShadow: t.shadowPop, marginTop: 6 } } },
      MuiMenuItem: { styleOverrides: { root: { fontSize: '0.9375rem', minHeight: 38 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 20, boxShadow: t.shadowPop, backgroundColor: t.surface } } },
      MuiDialogTitle: { styleOverrides: { root: { ...display, fontSize: '1.375rem', letterSpacing: '-0.015em', padding: '24px 24px 8px' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '12px 24px 24px', gap: 8 } } },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999, fontWeight: 600, fontSize: '0.8125rem', height: 26, backgroundColor: t.subtle, border: 'none' },
          outlined: { backgroundColor: 'transparent', border: `1.5px solid ${t.borderStrong}` },
          colorPrimary: { backgroundColor: t.accentSoft, color: t.accent },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: { root: { backgroundColor: t.ink, color: t.onInk, borderBottom: 'none' } },
      },
      MuiToolbar: { styleOverrides: { root: { minHeight: 58, '@media (min-width:600px)': { minHeight: 58 } } } },
      MuiBottomNavigation: { styleOverrides: { root: { backgroundColor: t.surface, borderTop: `1px solid ${t.border}`, height: 64 } } },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: { color: t.text3, '&.Mui-selected': { color: t.accent } },
          label: { fontSize: '0.8125rem', fontWeight: 600, '&.Mui-selected': { fontSize: '0.8125rem' } },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none', fontSize: '0.875rem', fontWeight: 600, paddingBlock: 6, paddingInline: 14, color: t.text2, borderColor: t.borderStrong,
            '&.Mui-selected': { backgroundColor: t.ink, color: t.onInk, '&:hover': { backgroundColor: t.ink } },
          },
        },
      },
      MuiToggleButtonGroup: { styleOverrides: { root: { borderRadius: 999 }, firstButton: { borderRadius: '999px 0 0 999px' }, lastButton: { borderRadius: '0 999px 999px 0' } } },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12, fontSize: '0.875rem', fontWeight: 500, alignItems: 'center', paddingBlock: 4 },
        },
        variants: [
          { props: { severity: 'success' }, style: { backgroundColor: t.successSoft, color: t.success } },
          { props: { severity: 'info' }, style: { backgroundColor: t.infoSoft, color: t.info } },
          { props: { severity: 'warning' }, style: { backgroundColor: t.warningSoft, color: t.warning } },
          { props: { severity: 'error' }, style: { backgroundColor: t.dangerSoft, color: t.danger } },
        ],
      },
      MuiLinearProgress: {
        styleOverrides: { root: { height: 8, borderRadius: 4, backgroundColor: t.border }, bar: { borderRadius: 4 } },
      },
      MuiList: { defaultProps: { dense: true } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiListItemText: { styleOverrides: { primary: { fontSize: '0.9375rem', fontWeight: 600 }, secondary: { fontSize: '0.875rem' } } },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: t.border, fontSize: '0.875rem', paddingBlock: 12 },
          head: { color: t.text2, fontWeight: 600, backgroundColor: t.surface, fontSize: '0.8125rem' },
        },
      },
      MuiSwitch: { defaultProps: { size: 'small' } },
      MuiDivider: { styleOverrides: { root: { borderColor: t.border } } },
      MuiSnackbar: { defaultProps: { anchorOrigin: { vertical: 'bottom', horizontal: 'center' } } },
      MuiSnackbarContent: { styleOverrides: { root: { backgroundColor: t.ink, color: t.onInk, borderRadius: 999, fontWeight: 600 } } },
    },
  });
}
