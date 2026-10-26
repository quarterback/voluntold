import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ApiError } from '../api';

/** Loads data and reloads on demand. Sends a 401 to the sign-in page. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setData(await load());
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && !location.pathname.startsWith('/me')) {
        location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
        return;
      }
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, reload, setData };
}

export function Loading({ error }: { error?: string | null }) {
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
      <CircularProgress size={28} aria-label="Loading" />
    </Box>
  );
}

/** Page frame: a title row with an optional action, then the content. */
export function Page({ title, subtitle, action, back, children, width = 960 }: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  return (
    <Box sx={{ maxWidth: width, mx: 'auto', px: { xs: 2, md: 4 }, pt: { xs: 2, md: 4 }, pb: { xs: 11, md: 6 } }}>
      {back && <Box sx={{ mb: 1 }}>{back}</Box>}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1" component="h1">{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
        </Box>
        {action && <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>{action}</Stack>}
      </Stack>
      {children}
    </Box>
  );
}

/** A bordered card with a heading, an optional one-line note, and content. */
export function Section({ title, note, action, children, flush }: { title?: string; note?: string; action?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <Card>
      {(title || action) && (
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, pt: 2, pb: flush ? 1.5 : 0 }}>
          <Box>
            {title && <Typography variant="h2" component="h2">{title}</Typography>}
            {note && <Typography variant="body2" color="text.secondary">{note}</Typography>}
          </Box>
          {action}
        </Stack>
      )}
      {flush ? children : <CardContent sx={{ pt: title ? 1.5 : 2.5 }}>{children}</CardContent>}
    </Card>
  );
}

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

/** A small status pill. The word carries the meaning; the color only helps. */
export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { vt } = useTheme();
  const colors: Record<Tone, [string, string]> = {
    neutral: [vt.subtle, vt.text2],
    accent: [vt.accentSoft, vt.accent],
    success: [vt.successSoft, vt.success],
    warning: [vt.warningSoft, vt.warning],
    danger: [vt.dangerSoft, vt.danger],
    info: [vt.infoSoft, vt.info],
  };
  const [bg, fg] = colors[tone];
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', height: 22, px: 1, borderRadius: 1.5, bgcolor: bg, color: fg,
      fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', border: tone === 'neutral' ? `1px solid ${vt.border}` : 'none',
    }}>
      {label}
    </Box>
  );
}

/** A KPI tile: a sentence-case label and one number in the text color. */
export function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <Card sx={{ flex: 1, minWidth: 0 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', mt: 0.5 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

/** What to show when a list is empty: what's missing and how to add it. */
export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="h2" component="p">{title}</Typography>
        {body && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{body}</Typography>}
        {action && <Box sx={{ mt: 2 }}>{action}</Box>}
      </CardContent>
    </Card>
  );
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Try again.';
}

// Confirm and prompt dialogs. Buttons name the action ("Cancel task"), never
// OK or Yes, so people can tell what each one does.

interface ConfirmOptions {
  title: string;
  body?: string;
  confirm: string;
  cancel?: string;
  destructive?: boolean;
}
interface PromptOptions {
  title: string;
  label: string;
  confirm: string;
}
interface DialogApi {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  prompt: (o: PromptOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogApi | null>(null);
export const useDialogs = () => useContext(DialogContext)!;

type Open =
  | { kind: 'confirm'; o: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'prompt'; o: PromptOptions; resolve: (v: string | null) => void };

export function DialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const [text, setText] = useState('');
  const api = useRef<DialogApi>({
    confirm: (o) => new Promise((resolve) => setOpen({ kind: 'confirm', o, resolve })),
    prompt: (o) => new Promise((resolve) => { setText(''); setOpen({ kind: 'prompt', o, resolve }); }),
  });
  const close = (value: boolean | string | null) => {
    if (open?.kind === 'confirm') open.resolve(value === true);
    if (open?.kind === 'prompt') open.resolve(typeof value === 'string' ? value : null);
    setOpen(null);
  };
  return (
    <DialogContext.Provider value={api.current}>
      {children}
      <Dialog open={!!open} onClose={() => close(false)} fullWidth maxWidth="xs">
        {open?.kind === 'confirm' && (
          <>
            <DialogTitle>{open.o.title}</DialogTitle>
            {open.o.body && <DialogContent><Typography color="text.secondary">{open.o.body}</Typography></DialogContent>}
            <DialogActions>
              <Button variant="outlined" onClick={() => close(false)}>{open.o.cancel ?? 'Cancel'}</Button>
              <Button variant="contained" color={open.o.destructive ? 'error' : 'primary'} onClick={() => close(true)}>{open.o.confirm}</Button>
            </DialogActions>
          </>
        )}
        {open?.kind === 'prompt' && (
          <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) close(text.trim()); }}>
            <DialogTitle>{open.o.title}</DialogTitle>
            <DialogContent>
              <TextField autoFocus label={open.o.label} value={text} onChange={(e) => setText(e.target.value)} sx={{ mt: 0.5 }} />
            </DialogContent>
            <DialogActions>
              <Button variant="outlined" onClick={() => close(null)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={!text.trim()}>{open.o.confirm}</Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </DialogContext.Provider>
  );
}

/** A colored square holding an icon, at the start of a decision row. */
export function IconTile({ icon, tone = 'neutral' }: { icon: ReactNode; tone?: Tone }) {
  const { vt } = useTheme();
  const colors: Record<Tone, [string, string]> = {
    neutral: [vt.subtle, vt.text2], accent: [vt.accentSoft, vt.accent], success: [vt.successSoft, vt.success],
    warning: [vt.warningSoft, vt.warning], danger: [vt.dangerSoft, vt.danger], info: [vt.infoSoft, vt.info],
  };
  const [bg, fg] = colors[tone];
  return (
    <Box aria-hidden sx={{ width: 32, height: 32, flexShrink: 0, borderRadius: 2, bgcolor: bg, color: fg, display: 'grid', placeItems: 'center',
      border: tone === 'neutral' ? `1px solid ${vt.border}` : 'none', '& svg': { fontSize: 18 } }}>{icon}</Box>
  );
}

/** Initials in a circle. Gray when the person can't be asked right now. */
export function Initials({ name, muted, size = 36 }: { name: string; muted?: boolean; size?: number }) {
  const { vt } = useTheme();
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  return (
    <Box aria-hidden sx={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center',
      fontSize: size < 32 ? '0.6875rem' : '0.8125rem', fontWeight: 600,
      bgcolor: muted ? vt.subtle : vt.accentSoft, color: muted ? vt.text3 : vt.accent, border: muted ? `1px solid ${vt.border}` : 'none' }}>
      {letters}
    </Box>
  );
}

/** A progress bar split into one piece per spot. */
export function SpotBar({ filled, total, label }: { filled: number; total: number; label: string }) {
  const { vt } = useTheme();
  return (
    <Box role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={filled} sx={{ display: 'flex', gap: 0.5, height: 6 }}>
      {Array.from({ length: Math.min(total, 40) }, (_, i) => (
        <Box key={i} sx={{ flex: 1, borderRadius: 3, bgcolor: i < filled ? vt.accent : vt.border }} />
      ))}
    </Box>
  );
}
