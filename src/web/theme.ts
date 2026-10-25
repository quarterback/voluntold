// Material 3 color roles generated from one seed (decision 0004). Never edit
// these by hand: change the seed instead.
import { createTheme, type Theme } from '@mui/material/styles';
import { Hct, SchemeVibrant, argbFromHex, hexFromArgb } from '@material/material-color-utilities';

export const SEED = '#00B8A9';

export function roles(dark: boolean) {
  const s = new SchemeVibrant(Hct.fromInt(argbFromHex(SEED)), dark, 0);
  const hex = (n: number) => hexFromArgb(n);
  return {
    primary: hex(s.primary),
    onPrimary: hex(s.onPrimary),
    primaryContainer: hex(s.primaryContainer),
    onPrimaryContainer: hex(s.onPrimaryContainer),
    secondary: hex(s.secondary),
    onSecondary: hex(s.onSecondary),
    secondaryContainer: hex(s.secondaryContainer),
    onSecondaryContainer: hex(s.onSecondaryContainer),
    tertiary: hex(s.tertiary),
    error: hex(s.error),
    onError: hex(s.onError),
    errorContainer: hex(s.errorContainer),
    onErrorContainer: hex(s.onErrorContainer),
    surface: hex(s.surface),
    onSurface: hex(s.onSurface),
    onSurfaceVariant: hex(s.onSurfaceVariant),
    surfaceContainerLow: hex(s.surfaceContainerLow),
    surfaceContainer: hex(s.surfaceContainer),
    surfaceContainerHigh: hex(s.surfaceContainerHigh),
    outline: hex(s.outline),
    outlineVariant: hex(s.outlineVariant),
  };
}

export type Roles = ReturnType<typeof roles>;

declare module '@mui/material/styles' {
  interface Theme {
    m3: Roles;
  }
  interface ThemeOptions {
    m3?: Roles;
  }
}

export function makeTheme(dark: boolean): Theme {
  const r = roles(dark);
  return createTheme({
    m3: r,
    palette: {
      mode: dark ? 'dark' : 'light',
      primary: { main: r.primary, contrastText: r.onPrimary },
      secondary: { main: r.secondary, contrastText: r.onSecondary },
      error: { main: r.error, contrastText: r.onError },
      background: { default: r.surface, paper: r.surfaceContainerLow },
      text: { primary: r.onSurface, secondary: r.onSurfaceVariant },
      divider: r.outlineVariant,
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'Roboto, system-ui, sans-serif',
      h1: { fontSize: '1.5rem', fontWeight: 400 },
      h2: { fontSize: '1.125rem', fontWeight: 500 },
      h3: { fontSize: '1rem', fontWeight: 500 },
      body2: { fontSize: '0.875rem' },
      button: { textTransform: 'none', fontWeight: 500, letterSpacing: '0.01em' },
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 20, minHeight: 36, paddingInline: 16 } } },
      MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundColor: r.surfaceContainerLow, borderRadius: 12 } } },
      MuiCardContent: { styleOverrides: { root: { padding: 16, '&:last-child': { paddingBottom: 16 } } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 8 } } },
      MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' }, styleOverrides: { root: { backgroundColor: r.surface } } },
      MuiToolbar: { styleOverrides: { root: { minHeight: 56 } } },
      MuiBottomNavigation: { styleOverrides: { root: { backgroundColor: r.surfaceContainer, height: 64 } } },
      MuiDialog: { styleOverrides: { paper: { backgroundColor: r.surfaceContainerHigh, borderRadius: 28 } } },
      MuiAlert: { styleOverrides: { root: { paddingBlock: 2 } } },
      // Compact fields: the content of most forms here is a few words.
      MuiTextField: { defaultProps: { fullWidth: true, size: 'small' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiList: { defaultProps: { dense: true } },
    },
  });
}
