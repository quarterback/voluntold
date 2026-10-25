import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardActionArea, CardContent, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import { Loading, errorText, useLoad } from './common';

interface Me {
  email: string;
  orgs: { id: string; name: string; role: string }[];
}

export function Start() {
  const navigate = useNavigate();
  const { data, error } = useLoad(() => api<Me>('/api/me'), []);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const choose = typeof location !== 'undefined' && new URLSearchParams(location.search).has('choose');

  if (!data) return <Loading error={error} />;
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

  async function sample() {
    setBusy(true);
    try {
      const res = await api<{ id: string }>('/api/dev/sample', { body: {} });
      navigate(`/o/${res.id}/today`);
    } catch (err) {
      setProblem(errorText(err));
      setBusy(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, py: { xs: 6, md: 10 } }}>
      <Typography variant="h1" component="h1" gutterBottom>Your organizations</Typography>
      {problem && <Alert severity="error" sx={{ mb: 2 }}>{problem}</Alert>}
      <Stack spacing={1.5} sx={{ mb: 4 }}>
        {data.orgs.map((o) => (
          <Card key={o.id}>
            <CardActionArea onClick={() => navigate(`/o/${o.id}/today`)}>
              <CardContent>
                <Typography variant="h3">{o.name}</Typography>
                <Typography color="text.secondary">{o.role === 'admin' ? 'Admin' : o.role === 'lead' ? 'Team lead' : 'Coordinator'}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
      <form onSubmit={create}>
        <Stack spacing={2}>
          <Typography variant="h2" component="h2">New organization</Typography>
          <TextField label="Organization name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="contained" disabled={busy || !name.trim()}>Create organization</Button>
          <Button onClick={sample} disabled={busy}>Try sample data</Button>
        </Stack>
      </form>
    </Box>
  );
}
