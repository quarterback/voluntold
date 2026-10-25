import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import { errorText } from './common';

export function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ sent: boolean; devCode?: string }>('/api/auth/start', { body: { email } });
      setSent(true);
      setDevCode(res.devCode ?? null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/verify', { body: { email, code } });
      const next = new URLSearchParams(location.search).get('next');
      location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto', px: 2, py: 6 }}>
      <Typography variant="h1" component="h1" gutterBottom>Sign in</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Volunteers don't sign in. They answer from their link.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!sent ? (
        <form onSubmit={start}>
          <Stack spacing={2}>
            <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" variant="contained" disabled={busy}>Send code</Button>
          </Stack>
        </form>
      ) : (
        <form onSubmit={verify}>
          <Stack spacing={2}>
            <Typography>Code sent to {email}.</Typography>
            {devCode && <Alert severity="info">Test mode code: <strong>{devCode}</strong></Alert>}
            <TextField
              label="Code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <Button type="submit" variant="contained" disabled={busy || code.length !== 6}>Sign in</Button>
            <Button onClick={() => { setSent(false); setCode(''); }}>Use another email</Button>
          </Stack>
        </form>
      )}
    </Box>
  );
}
