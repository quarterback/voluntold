import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardActionArea, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import { Wordmark } from '../Wordmark';
import { api } from '../api';
import { Loading, errorText, useLoad } from './common';

interface Me {
  email: string;
  orgs: { id: string; name: string; role: string; sample: number }[];
}

export function Start() {
  const navigate = useNavigate();
  const { data, error } = useLoad(() => api<Me>('/api/me'), []);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const params = new URLSearchParams(location.search);
  const choose = params.has('choose');
  const wantDemo = params.has('demo');

  // "Try the demo" on the home page lands here after sign-in.
  useEffect(() => {
    if (data && wantDemo) demo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, wantDemo]);

  if (!data) return <Loading error={error} />;
  if (wantDemo && !problem) return <Loading />;
  if (data.orgs.length === 1 && !choose) return <Navigate to={`/o/${data.orgs[0].id}/today`} replace />;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ id: string }>('/api/orgs', { body: { name, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone } });
      navigate(`/o/${res.id}/settings?welcome=1`);
    } catch (err) {
      setProblem(errorText(err));
      setBusy(false);
    }
  }

  async function demo() {
    setBusy(true);
    try {
      const res = await api<{ id: string }>('/api/sample', { body: {} });
      navigate(`/o/${res.id}/today`, { replace: true });
    } catch (err) {
      setProblem(errorText(err));
      setBusy(false);
    }
  }

  const fresh = data.orgs.length === 0;
  const role = (o: Me['orgs'][number]) => (o.sample ? 'Demo' : o.role === 'admin' ? 'Admin' : o.role === 'lead' ? 'Team lead' : 'Coordinator');

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, py: { xs: 6, md: 10 } }}>
      <Box sx={{ mb: 4, color: 'text.primary' }}><Wordmark height={32} /></Box>
      {problem && <Alert severity="error" sx={{ mb: 2 }}>{problem}</Alert>}

      {fresh ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h1" component="h1" sx={{ fontSize: '1.75rem', mb: 1 }}>Start with the demo</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>A sample food pantry with 26 volunteers and open work, and a walk through five screens.</Typography>
            <Button variant="contained" size="large" onClick={demo} disabled={busy}>Try the demo</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Typography variant="h1" component="h1" sx={{ fontSize: '1.75rem', mb: 2 }}>Your organizations</Typography>
          <Stack spacing={1.5} sx={{ mb: 4 }}>
            {data.orgs.map((o) => (
              <Card key={o.id}>
                <CardActionArea onClick={() => navigate(`/o/${o.id}/today`)}>
                  <CardContent>
                    <Typography variant="h3">{o.name}</Typography>
                    <Typography color="text.secondary">{role(o)}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
            {!data.orgs.some((o) => o.sample) && <Box><Button onClick={demo} disabled={busy}>Try the demo</Button></Box>}
          </Stack>
        </>
      )}

      {fresh && <Divider sx={{ mb: 3 }} />}
      <form onSubmit={create}>
        <Stack spacing={2}>
          <Typography variant="h2" component="h2">{fresh ? 'Or create your organization' : 'New organization'}</Typography>
          <TextField label="Organization name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Box><Button type="submit" variant={fresh ? 'outlined' : 'contained'} disabled={busy || !name.trim()}>Create organization</Button></Box>
        </Stack>
      </form>
    </Box>
  );
}
