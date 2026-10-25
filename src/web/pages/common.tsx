import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
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
      <CircularProgress aria-label="Loading" />
    </Box>
  );
}

export function Page({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', px: 2, pt: 1.5, pb: 11 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h1" component="h1">{title}</Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>{children}</Typography>;
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Try again.';
}
