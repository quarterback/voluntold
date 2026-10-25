import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import ClockIcon from '@mui/icons-material/ScheduleOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import { api } from '../api';
import { Loading, errorText, useDialogs, useLoad } from './common';
import { shortDate } from '../format';
import { timeRange } from '../../shared/time';

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
  yes: 'You said yes',
  no: 'You said no',
  filled: "This one's already filled. Thank you.",
  closed: 'Canceled',
};

/** The calendar-style date block on the left of a task. */
function DateBlock({ ms }: { ms: number | null }) {
  if (!ms) return null;
  const d = new Date(ms);
  return (
    <Box sx={{ width: 56, flexShrink: 0, textAlign: 'center', border: (t) => `1px solid ${t.vt.border}`, borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper' }}>
      <Box sx={{ bgcolor: (t) => t.vt.accentSoft, color: 'primary.main', fontSize: '0.6875rem', fontWeight: 600, py: 0.25 }}>
        {d.toLocaleDateString('en-US', { month: 'short' })}
      </Box>
      <Typography sx={{ fontSize: '1.375rem', fontWeight: 600, lineHeight: 1.2, pt: 0.25 }}>{d.getDate()}</Typography>
      <Typography variant="caption" component="p" sx={{ pb: 0.5 }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</Typography>
    </Box>
  );
}

function Line({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', color: 'text.secondary' }}>
      <Box sx={{ display: 'flex', mt: '1px', '& svg': { fontSize: 18 } }}>{icon}</Box>
      <Typography variant="body1" color="text.primary">{children}</Typography>
    </Stack>
  );
}

function TaskInfo({ task, big }: { task: VTask; big?: boolean }) {
  const date = task.timing === 'at_time' ? task.startsAt : task.timing === 'by_date' ? task.dueAt : null;
  const time =
    task.timing === 'at_time' && task.startsAt && task.endsAt ? timeRange(task.startsAt, task.endsAt) :
    task.timing === 'by_date' ? 'Any time before the end of the day' : 'Any time';
  const place = [task.placePublic, task.placePrivate].filter(Boolean).join(', ');
  return (
    <Stack direction="row" spacing={2}>
      <DateBlock ms={date} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: big ? '1.125rem' : '1rem', fontWeight: 600, letterSpacing: '-0.01em', mb: 1 }}>{task.title}</Typography>
        <Stack spacing={0.75}>
          <Line icon={<ClockIcon />}>{time}</Line>
          {place && <Line icon={<PlaceIcon />}>{place}</Line>}
          {task.contact && <Line icon={<PersonIcon />}>Ask for {task.contact.replace(/^ask for /i, '')}</Line>}
        </Stack>
        {big && task.description && <Typography color="text.secondary" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>{task.description}</Typography>}
      </Box>
    </Stack>
  );
}

export function VolunteerPage() {
  const focus = new URLSearchParams(location.search).get('ask');
  const dialogs = useDialogs();
  const { data, error, reload } = useLoad(() => api('/api/v/me'), []);
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [until, setUntil] = useState('');
  const [busy, setBusy] = useState(false);

  if (!data) {
    if (error) {
      return (
        <Box sx={{ maxWidth: 520, mx: 'auto', px: 2, py: 8, textAlign: 'center' }}>
          <Typography variant="h1" component="h1">Link expired</Typography>
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

  async function giveUp(spotId: string) {
    const ok = await dialogs.confirm({ title: 'Give up your spot?', confirm: 'Give up spot', cancel: 'Keep my spot', destructive: true });
    if (ok) await run(() => api(`/api/v/spots/${spotId}/cant`, { body: {} }));
  }

  async function stop() {
    const ok = await dialogs.confirm({ title: `Stop all asks from ${data.org.name}?`, confirm: 'Stop asks', destructive: true });
    if (ok) await run(() => api('/api/v/stop', { body: {} }));
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
    <Box sx={{ maxWidth: 520, mx: 'auto', px: 2, pt: 4, pb: 6 }}>
      <Typography variant="body2" color="text.secondary">{data.org.name}</Typography>
      <Typography variant="h1" component="h1" sx={{ mb: 2.5 }}>Hi {v.name.split(' ')[0]}</Typography>
      <Stack spacing={2}>
        {problem && <Alert severity="error">{problem}</Alert>}
        {stopped && <Alert severity="info">Asks stopped</Alert>}
        {v.status === 'paused' && v.pausedReason === 'volunteer' && v.pausedUntil && (
          <Alert severity="info" action={<Button color="inherit" size="small" disabled={busy} onClick={() => run(() => api('/api/v/resume', { body: {} }))}>End break</Button>}>
            On a break until {shortDate(v.pausedUntil)}
          </Alert>
        )}

        {ordered.map((a: any) => {
          const result = answered[a.id];
          const canAnswer = !result && !stopped && !a.holding && a.status !== 'no' && a.task.status === 'open';
          return (
            <Card key={a.id}>
              <CardContent sx={{ p: 2.5 }}>
                <TaskInfo task={a.task} big />
                {result && <Alert severity={result === 'yes' ? 'success' : 'info'} sx={{ mt: 2 }}>{ANSWER_TEXT[result]}</Alert>}
                {!result && a.task.status === 'filled' && !a.holding && <Alert severity="info" sx={{ mt: 2 }}>{ANSWER_TEXT.filled}</Alert>}
                {!result && a.holding && <Alert severity="success" sx={{ mt: 2 }}>{ANSWER_TEXT.yes}</Alert>}
                {!result && !a.holding && a.status === 'no' && <Alert severity="info" sx={{ mt: 2 }}>{ANSWER_TEXT.no}</Alert>}
                {!result && ['canceled', 'done'].includes(a.task.status) && !a.holding && <Alert severity="info" sx={{ mt: 2 }}>{ANSWER_TEXT.closed}</Alert>}
                {canAnswer && (
                  <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                    <Button variant="contained" size="large" disabled={busy} onClick={() => answer(a.id, 'yes')} sx={{ flex: 1 }}>Yes</Button>
                    <Button variant="outlined" size="large" disabled={busy} onClick={() => answer(a.id, 'no')} sx={{ flex: 1 }}>No</Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          );
        })}

        <Box>
          <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Coming up</Typography>
          {data.upcoming.length === 0 ? <Typography variant="body2" color="text.secondary">Nothing coming up</Typography> : (
            <Card>
              {data.upcoming.map((s: any, i: number) => (
                <Box key={s.id}>
                  {i > 0 && <Divider />}
                  <Box sx={{ p: 2 }}>
                    <TaskInfo task={s.task} />
                    {s.task.status === 'canceled' ? (
                      <Alert severity="warning" sx={{ mt: 1.5 }}>Canceled</Alert>
                    ) : (
                      <Box sx={{ mt: 1, ml: 9 }}>
                        <Button size="small" color="error" disabled={busy} onClick={() => giveUp(s.id)}>I can't make it</Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Card>
          )}
        </Box>

        {data.past.filter((s: any) => s.status === 'done').length > 0 && (
          <Box>
            <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Done</Typography>
            <Card>
              {data.past.filter((s: any) => s.status === 'done').map((s: any, i: number) => (
                <Box key={s.id}>
                  {i > 0 && <Divider />}
                  <Box sx={{ p: 2 }}><TaskInfo task={s.task} /></Box>
                </Box>
              ))}
            </Card>
          </Box>
        )}

        {!stopped && (
          <Card>
            <CardContent>
              <Typography variant="h2" component="h2" sx={{ mb: 1.5 }}>Take a break</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
                <TextField type="date" label="Until" value={until} onChange={(e) => setUntil(e.target.value)} />
                <Button variant="outlined" disabled={!until || busy} onClick={() => run(() => api('/api/v/pause', { body: { until: `${until}T00:00` } }))}>Pause asks</Button>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Button color="error" disabled={busy} onClick={stop} sx={{ ml: -1 }}>Stop asking me</Button>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
