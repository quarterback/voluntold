import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardActionArea, CardContent, Checkbox, Divider, FormControl, FormControlLabel, FormLabel, InputLabel, MenuItem, Radio, RadioGroup, Select, Stack, TextField, Typography } from '@mui/material';
import { Wordmark } from '../Wordmark';
import { api } from '../api';
import { Help, Loading, errorText, useLoad } from './common';
import { SAMPLE_KINDS, sampleKind } from '../../shared/samples';
import { BROWSER_DEMO, StartOverButton } from '../demoMode';
import { DemoIntro } from './DemoIntro';
import { CURRENT_TOOLS, PEOPLE_WORDS, SIZE_BANDS, type PeopleWord } from '../../shared/membership';
import { BRAND } from '../../shared/brand';

interface Me {
  email: string;
  orgs: { id: string; name: string; role: string; sample: number; sample_kind: string | null }[];
  admin?: boolean;
}

export function Start() {
  const navigate = useNavigate();
  const { data, error } = useLoad(() => api<Me>('/api/me'), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const params = new URLSearchParams(location.search);
  const choose = params.has('choose');
  const adding = params.has('new');
  const wantDemo = BROWSER_DEMO || params.has('demo');

  if (!data) return <Loading error={error} />;
  const fresh = data.orgs.length === 0;
  if (!wantDemo && !choose && !adding && data.orgs.length === 1) return <Navigate to={`/o/${data.orgs[0].id}/today`} replace />;

  async function open(kind: string) {
    setBusy(kind);
    try {
      const res = await api<{ id: string }>('/api/sample', { body: { kind } });
      navigate(`/o/${res.id}/today`);
    } catch (err) {
      setProblem(errorText(err));
      setBusy(null);
    }
  }

  const have = new Set(data.orgs.map((o) => o.sample_kind).filter(Boolean));
  const role = (o: Me['orgs'][number]) => (o.sample ? `Demo · ${sampleKind(o.sample_kind)?.sector ?? 'Sample'}` : o.role === 'admin' ? 'Admin' : o.role === 'lead' ? 'Team lead' : 'Coordinator');

  // The demo: pick a sample organization (docs/specs/demo.md).
  if (wantDemo) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto', px: 2, py: { xs: 5, md: 8 } }}>
        <Box component="a" href="/" aria-label={`${BRAND.name} home`} onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/'); }} sx={{ display: 'inline-block', mb: 3, color: 'text.primary' }}><Wordmark height={32} /></Box>
        <DemoIntro />
        <Typography variant="h2" component="h2" sx={{ mb: 2 }}>Pick a sample organization</Typography>
        {problem && <Alert severity="error" sx={{ mb: 2 }}>{problem}</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          {SAMPLE_KINDS.map((k) => (
            <Card key={k.kind}>
              <CardActionArea disabled={busy !== null} onClick={() => open(k.kind)} sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%' }}>
                  <Typography variant="caption" component="p">{k.sector}</Typography>
                  <Typography variant="h2" component="h2" sx={{ mt: 0.25, mb: 0.75 }}>{k.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{k.blurb}</Typography>
                  <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 600, color: 'primary.main' }}>
                    {busy === k.kind ? 'Opening…' : have.has(k.kind) ? 'Open' : 'Create and open'}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
        {BROWSER_DEMO
          ? have.size > 0 && <Box sx={{ mt: 3 }}><StartOverButton /></Box>
          : <Box sx={{ mt: 3 }}><Button onClick={() => navigate(fresh ? '/signup' : '/start?choose=1')}>{fresh ? 'Create your organization' : 'Your organizations'}</Button></Box>}
      </Box>
    );
  }

  // A new account, or one more organization: the guided sign-up.
  if (fresh || adding) return <Navigate to="/signup" replace />;

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, py: { xs: 6, md: 10 } }}>
      <Box sx={{ mb: 4, color: 'text.primary' }}><Wordmark height={32} /></Box>
      {problem && <Alert severity="error" sx={{ mb: 2 }}>{problem}</Alert>}
      <Typography variant="h1" component="h1" sx={{ fontSize: '1.75rem', mb: 2 }}>Your organizations</Typography>
      <Stack spacing={1.5}>
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
        <Box><Button variant="outlined" onClick={() => navigate('/signup')}>New organization</Button></Box>
        <Box><Button onClick={() => navigate('/start?demo=1')}>Open a sample organization</Button></Box>
        {data.admin && <Box><Button onClick={() => navigate('/admin')}>Approve organizations</Button></Box>}
      </Stack>
    </Box>
  );
}
