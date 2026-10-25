import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import { Loading, errorText, useLoad } from './common';
import { shortDate, when } from '../format';

interface VTask {
  id: string;
  title: string;
  description: string;
  contact: string;
  timing: string;
  startsAt: number | null;
  endsAt: number | null;
  dueAt: number | null;
  placePublic: string;
  placePrivate: string;
  status: string;
}

const ANSWER_TEXT: Record<string, string> = {
  yes: 'You said yes. Thank you.',
  no: 'You said no. Thanks for telling us.',
  filled: "This one's already filled. Thank you.",
  closed: "This task isn't happening anymore.",
};

function TaskInfo({ task }: { task: VTask }) {
  return (
    <>
      <Typography variant="h2" component="h2">{task.title}</Typography>
      <Typography sx={{ mt: 0.5 }}>{when(task)}</Typography>
      {(task.placePublic || task.placePrivate) && <Typography color="text.secondary">{[task.placePublic, task.placePrivate].filter(Boolean).join(', ')}</Typography>}
      {task.description && <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{task.description}</Typography>}
      {task.contact && <Typography sx={{ mt: 1 }}><strong>Who to find:</strong> {task.contact}</Typography>}
    </>
  );
}

export function VolunteerPage() {
  const focus = new URLSearchParams(location.search).get('ask');
  const { data, error, reload } = useLoad(() => api('/api/v/me'), []);
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [until, setUntil] = useState('');
  const [busy, setBusy] = useState(false);

  if (!data) {
    if (error) {
      return (
        <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 6 }}>
          <Typography variant="h1" component="h1" gutterBottom>Open the link you were sent</Typography>
          <Typography color="text.secondary">If your link stopped working, ask the organization for a new one.</Typography>
        </Box>
      );
    }
    return <Loading />;
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setProblem(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setProblem(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function answer(askId: string, value: 'yes' | 'no') {
    await run(async () => {
      const res = await api(`/api/v/asks/${askId}/answer`, { body: { answer: value } });
      setAnswered({ ...answered, [askId]: res.result });
    });
  }

  const v = data.volunteer;
  const stopped = v.status === 'stopped';
  // Asks still worth showing: waiting ones, ones just answered, and ones that
  // closed because the task filled (so the person hears it's filled).
  const open = data.asks.filter((a: any) =>
    a.status === 'waiting' || a.status === 'expired' || answered[a.id] || a.id === focus ||
    (a.status === 'closed' && ['open', 'filled'].includes(a.task.status)));
  const ordered = [...open].sort((a: any, b: any) => (a.id === focus ? -1 : b.id === focus ? 1 : 0));

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 3 }}>
      <Typography color="text.secondary">{data.org.name}</Typography>
      <Typography variant="h1" component="h1" sx={{ mb: 2 }}>Hi {v.name.split(' ')[0]}</Typography>
      {problem && <Alert severity="error" sx={{ mb: 2 }}>{problem}</Alert>}
      {stopped && <Alert severity="info" sx={{ mb: 2 }}>You won't get new asks.</Alert>}
      {v.status === 'paused' && v.pausedReason === 'volunteer' && v.pausedUntil && (
        <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" disabled={busy} onClick={() => run(() => api('/api/v/resume', { body: {} }))}>End break</Button>}>
          On a break until {shortDate(v.pausedUntil)}.
        </Alert>
      )}

      <Stack spacing={1.5}>
        {ordered.map((a: any) => {
          const result = answered[a.id];
          const canAnswer = !result && !stopped && !a.holding && a.status !== 'no' && a.task.status === 'open';
          return (
            <Card key={a.id}>
              <CardContent>
                <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>Can you help?</Typography>
                <TaskInfo task={a.task} />
                {result && <Alert severity={result === 'yes' ? 'success' : 'info'} sx={{ mt: 2 }}>{ANSWER_TEXT[result]}</Alert>}
                {!result && a.task.status === 'filled' && !a.holding && <Alert severity="info" sx={{ mt: 2 }}>{ANSWER_TEXT.filled}</Alert>}
                {!result && a.holding && <Alert severity="success" sx={{ mt: 2 }}>{ANSWER_TEXT.yes}</Alert>}
                {!result && !a.holding && a.status === 'no' && <Alert severity="info" sx={{ mt: 2 }}>{ANSWER_TEXT.no}</Alert>}
                {!result && ['canceled', 'done'].includes(a.task.status) && !a.holding && <Alert severity="info" sx={{ mt: 2 }}>{ANSWER_TEXT.closed}</Alert>}
                {canAnswer && (
                  <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                    <Button variant="contained" size="large" disabled={busy} onClick={() => answer(a.id, 'yes')} sx={{ flex: 1 }}>Yes</Button>
                    <Button variant="outlined" size="large" disabled={busy} onClick={() => answer(a.id, 'no')} sx={{ flex: 1 }}>No</Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          );
        })}
        {ordered.length === 0 && <Typography color="text.secondary">Nothing to answer right now.</Typography>}

        <Box>
          <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Coming up</Typography>
          {data.upcoming.length === 0 ? <Typography color="text.secondary">Nothing coming up.</Typography> : (
            <Stack spacing={1.5}>
              {data.upcoming.map((s: any) => (
                <Card key={s.id}>
                  <CardContent>
                    <TaskInfo task={s.task} />
                    {s.task.status === 'canceled' ? (
                      <Alert severity="warning" sx={{ mt: 1 }}>Canceled. You don't need to go.</Alert>
                    ) : (
                      <Button sx={{ mt: 1 }} color="error" disabled={busy} onClick={() => confirm('Give up your spot?') && run(() => api(`/api/v/spots/${s.id}/cant`, { body: {} }))}>I can't make it</Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        {data.past.length > 0 && (
          <Box>
            <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Done</Typography>
            {data.past.filter((s: any) => s.status === 'done').map((s: any) => (
              <Typography key={s.id}>{s.task.title} · {when(s.task)}</Typography>
            ))}
          </Box>
        )}

        <Divider />
        {!stopped && (
          <Box>
            <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Take a break</Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField size="small" type="date" label="Until" value={until} onChange={(e) => setUntil(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 200 }} />
              <Button disabled={!until || busy} onClick={() => run(() => api('/api/v/pause', { body: { until: `${until}T00:00` } }))}>Pause</Button>
            </Stack>
            <Button color="error" sx={{ mt: 2 }} disabled={busy} onClick={() => confirm(`Stop all asks from ${data.org.name}?`) && run(() => api('/api/v/stop', { body: {} }))}>Stop asking me</Button>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
