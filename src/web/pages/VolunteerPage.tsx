import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Divider, Link, Snackbar, Stack, TextField, Typography } from '@mui/material';
import RemoteIcon from '@mui/icons-material/LaptopOutlined';
import BagIcon from '@mui/icons-material/BackpackOutlined';
import FileIcon from '@mui/icons-material/DescriptionOutlined';
import ReportIcon from '@mui/icons-material/ReportGmailerrorredOutlined';
import { AvailabilityFields, type Avail } from './Availability';
import ClockIcon from '@mui/icons-material/ScheduleOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import { api } from '../api';
import { FONT_DISPLAY } from '../theme';
import { Loading, errorText, useDialogs, useLoad } from './common';
import { effortText, shortDate } from '../format';
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
  remote: boolean;
  effortMinutes: number | null;
  bring: string;
  files: { name: string; url: string }[];
}

const ANSWER_TEXT: Record<string, string> = {
  yes: 'Accepted',
  no: 'Declined',
  filled: 'This task is full',
  closed: 'Canceled',
};

/** The calendar-style date block on the left of a task. */
function DateBlock({ ms, tz }: { ms: number | null; tz?: string }) {
  if (!ms) return null;
  const d = new Date(ms);
  const dayNum = d.toLocaleDateString('en-US', { day: 'numeric', timeZone: tz });
  return (
    <Box sx={{ width: 64, flexShrink: 0, alignSelf: 'flex-start', textAlign: 'center', borderRadius: 3, overflow: 'hidden', bgcolor: (t) => t.vt.ink, color: (t) => t.vt.onInk }}>
      <Box sx={{ bgcolor: (t) => t.vt.lime, color: (t) => t.vt.onLime, fontSize: '0.75rem', fontWeight: 700, py: 0.375, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {d.toLocaleDateString('en-US', { month: 'short', timeZone: tz })}
      </Box>
      <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '1.75rem', lineHeight: 1.1, pt: 0.5 }}>{dayNum}</Typography>
      <Typography component="p" sx={{ fontSize: '0.75rem', fontWeight: 600, pb: 0.75, color: (t) => t.vt.onInk2 }}>{d.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz })}</Typography>
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

function TaskInfo({ task, big, tz }: { task: VTask; big?: boolean; tz?: string }) {
  const date = task.timing === 'at_time' ? task.startsAt : task.timing === 'by_date' ? task.dueAt : null;
  const time =
    task.timing === 'at_time' && task.startsAt && task.endsAt ? timeRange(task.startsAt, task.endsAt, tz) :
    task.timing === 'by_date' ? 'By end of day' : 'Any time';
  const place = [task.placePublic, task.placePrivate].filter(Boolean).join(', ');
  return (
    <Stack direction="row" spacing={2}>
      <DateBlock ms={date} tz={tz} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={big ? { fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.15, letterSpacing: '-0.02em', mb: 1.25 } : { fontSize: '1.0625rem', fontWeight: 600, mb: 0.75 }}>{task.title}</Typography>
        <Stack spacing={0.75}>
          <Line icon={<ClockIcon />}>{time}</Line>
          {place && <Line icon={<PlaceIcon />}>{place}</Line>}
          {task.contact && <Line icon={<PersonIcon />}>{task.contact}</Line>}
          {task.remote && <Line icon={<RemoteIcon />}>Remote{task.effortMinutes ? ` · about ${effortText(task.effortMinutes)}` : ''}</Line>}
          {task.bring && <Line icon={<BagIcon />}>Bring: {task.bring}</Line>}
          {task.files?.map((f) => <Line key={f.url} icon={<FileIcon />}><Link href={f.url} target="_blank" rel="noopener">{f.name}</Link></Line>)}
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
  const [avail, setAvail] = useState<Avail | null>(null);
  const [note, setNote] = useState<string | null>(null);

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
    const ok = await dialogs.confirm({ title: 'Cancel your spot?', confirm: 'Cancel spot', cancel: 'Go back', destructive: true });
    if (ok) await run(() => api(`/api/v/spots/${spotId}/cant`, { body: {} }));
  }

  async function report(spotId: string) {
    const text = await dialogs.prompt({ title: 'Report a problem', label: 'Problem', confirm: 'Send report' });
    if (text) await run(async () => { await api(`/api/v/spots/${spotId}/report`, { body: { body: text } }); setNote('Report sent'); });
  }

  async function take(taskId: string) {
    await run(async () => {
      const res = await api(`/api/v/tasks/${taskId}/take`, { body: {} });
      setNote(res.result === 'yes' ? 'Accepted' : ANSWER_TEXT[res.result] ?? 'Done');
    });
  }

  async function stop() {
    const ok = await dialogs.confirm({ title: `Unsubscribe from ${data.org.name}?`, confirm: 'Unsubscribe', destructive: true });
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
      <Box sx={{ bgcolor: (t) => t.vt.accent, color: (t) => t.vt.onAccent, borderRadius: 4, px: 2.5, py: 3, mb: 2 }}>
        <Typography sx={{ fontWeight: 600, color: (t) => t.vt.lime }}>{v.name}</Typography>
        <Typography variant="h1" component="h1" sx={{ mt: 0.5 }}>{data.org.name}</Typography>
      </Box>
      <Stack spacing={2}>
        {problem && <Alert severity="error">{problem}</Alert>}
        {stopped && <Alert severity="info">Unsubscribed</Alert>}
        {v.status === 'paused' && v.pausedReason === 'volunteer' && v.pausedUntil && (
          <Alert severity="info" action={<Button color="inherit" size="small" disabled={busy} onClick={() => run(() => api('/api/v/resume', { body: {} }))}>Resume</Button>}>
            Paused until {shortDate(v.pausedUntil)}
          </Alert>
        )}

        {ordered.map((a: any) => {
          const result = answered[a.id];
          const canAnswer = !result && !stopped && !a.holding && a.status !== 'no' && a.task.status === 'open';
          return (
            <Card key={a.id}>
              <CardContent sx={{ p: 2.5 }}>
                <TaskInfo task={a.task} big tz={data.org.timeZone} />
                {result && <Alert severity={result === 'yes' ? 'success' : 'info'} sx={{ mt: 2 }}>{ANSWER_TEXT[result]}</Alert>}
                {!result && a.task.status === 'filled' && !a.holding && <Alert severity="info" sx={{ mt: 2 }}>{ANSWER_TEXT.filled}</Alert>}
                {!result && a.holding && <Alert severity="success" sx={{ mt: 2 }}>{ANSWER_TEXT.yes}</Alert>}
                {!result && !a.holding && a.status === 'no' && <Alert severity="info" sx={{ mt: 2 }}>{ANSWER_TEXT.no}</Alert>}
                {!result && ['canceled', 'done'].includes(a.task.status) && !a.holding && <Alert severity="info" sx={{ mt: 2 }}>{ANSWER_TEXT.closed}</Alert>}
                {canAnswer && (
                  <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                    <Button variant="contained" size="large" disabled={busy} onClick={() => answer(a.id, 'yes')} sx={{ flex: 1 }}>Accept</Button>
                    <Button variant="outlined" size="large" disabled={busy} onClick={() => answer(a.id, 'no')} sx={{ flex: 1 }}>Decline</Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          );
        })}

        <Box>
          <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Upcoming</Typography>
          {data.upcoming.length === 0 ? <Typography variant="body2" color="text.secondary">No upcoming tasks</Typography> : (
            <Card>
              {data.upcoming.map((s: any, i: number) => (
                <Box key={s.id}>
                  {i > 0 && <Divider />}
                  <Box sx={{ p: 2 }}>
                    <TaskInfo task={s.task} tz={data.org.timeZone} />
                    {s.task.status === 'canceled' ? (
                      <Alert severity="warning" sx={{ mt: 1.5 }}>Canceled</Alert>
                    ) : (
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        <Button variant="outlined" disabled={busy} onClick={() => giveUp(s.id)} sx={{ flex: 1 }}>Cancel spot</Button>
                        <Button variant="outlined" startIcon={<ReportIcon fontSize="small" />} disabled={busy} onClick={() => report(s.id)} sx={{ flex: 1 }}>Report a problem</Button>
                      </Stack>
                    )}
                  </Box>
                </Box>
              ))}
            </Card>
          )}
        </Box>

        {!stopped && data.openForYou.length > 0 && (
          <Box>
            <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Open tasks</Typography>
            <Card>
              {data.openForYou.map((t: VTask, i: number) => (
                <Box key={t.id}>
                  {i > 0 && <Divider />}
                  <Stack direction="row" spacing={1.5} sx={{ p: 2, alignItems: 'center' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600 }}>{t.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[t.remote ? 'Remote' : t.placePublic, effortText(t.effortMinutes), t.timing === 'at_time' && t.startsAt ? `${shortDate(t.startsAt, data.org.timeZone)}, ${timeRange(t.startsAt, t.endsAt!, data.org.timeZone)}` : t.dueAt ? `by ${shortDate(t.dueAt, data.org.timeZone)}` : ''].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                    <Button variant="contained" size="small" disabled={busy} onClick={() => take(t.id)}>Accept</Button>
                  </Stack>
                </Box>
              ))}
            </Card>
          </Box>
        )}

        {!stopped && (
          <Card>
            <CardContent>
              <Typography variant="h2" component="h2" sx={{ mb: 1.5 }}>Availability</Typography>
              <AvailabilityFields value={avail ?? { hoursWeek: v.hoursWeek, days: v.days, remoteOk: v.remoteOk }} onChange={setAvail} disabled={busy} />
              {avail && (
                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" disabled={busy} onClick={() => run(async () => { await api('/api/v/availability', { body: avail }); setAvail(null); setNote('Saved'); })}>Save availability</Button>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {data.past.filter((s: any) => s.status === 'done').length > 0 && (
          <Box>
            <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Past</Typography>
            <Card>
              {data.past.filter((s: any) => s.status === 'done').map((s: any, i: number) => (
                <Box key={s.id}>
                  {i > 0 && <Divider />}
                  <Box sx={{ p: 2 }}><TaskInfo task={s.task} tz={data.org.timeZone} /></Box>
                </Box>
              ))}
            </Card>
          </Box>
        )}

        {!stopped && (
          <Card>
            <CardContent>
              <Typography variant="h2" component="h2" sx={{ mb: 1.5 }}>Pause asks</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
                <TextField type="date" label="Pause until" value={until} onChange={(e) => setUntil(e.target.value)} />
                <Button variant="outlined" disabled={!until || busy} onClick={() => run(() => api('/api/v/pause', { body: { until: `${until}T00:00` } }))}>Pause</Button>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Button color="error" disabled={busy} onClick={stop} sx={{ ml: -1 }}>Unsubscribe</Button>
            </CardContent>
          </Card>
        )}
      </Stack>
      <Snackbar open={!!note} autoHideDuration={2500} onClose={() => setNote(null)} message={note} />
    </Box>
  );
}
