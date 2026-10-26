import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Link, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Snackbar, Stack, Typography,
} from '@mui/material';
import BackIcon from '@mui/icons-material/ArrowBack';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { IconTile, Initials, Loading, Page, SpotBar, StatusBadge, errorText, useDialogs, useLoad } from './common';
import { REASON_TEXT, STATUS_TEXT, effortText, when } from '../format';
import { day, time } from '../../shared/time';
import PendingIcon from '@mui/icons-material/Pending';
import DoneIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined';
import SplitIcon from '@mui/icons-material/CallSplit';
import HubIcon from '@mui/icons-material/HubOutlined';
import { STATUS_TONE } from './Tasks';

interface NewAsk {
  askId: string;
  name: string;
  email: string | null;
  phone: string | null;
  link: string;
  message: string;
}

const ASK_STATUS: Record<string, string> = {
  waiting: 'Pending',
  yes: 'Accepted',
  no: 'Declined',
  expired: 'Expired',
  closed: 'Task filled',
};

const SPOT_STATUS: Record<string, string> = {
  holding: 'Confirmed',
  cant: 'Canceled',
  done: 'Attended',
  missed: 'No-show',
};

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** The links to send, one per person, with copy buttons. */
export function CopyList({ asks, onClose }: { asks: NewAsk[]; onClose: () => void }) {
  const { demo } = useOrg();
  const [copied, setCopied] = useState<string | null>(null);
  const all = asks.map((a) => a.message).join('\n\n');
  return (
    <Dialog open fullWidth maxWidth="sm" onClose={onClose}>
      <DialogTitle>Share {asks.length === 1 ? 'link' : `${asks.length} links`}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          {asks.map((a) => (
            <Box key={a.askId} sx={{ border: (t) => `1px solid ${t.vt.border}`, borderRadius: 2, p: 1.5 }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h3">{a.name}</Typography>
                  <Typography variant="caption" noWrap component="p">{[a.email, a.phone].filter(Boolean).join(' · ')}</Typography>
                </Box>
                {demo && <Button size="small" href={a.link} target="_blank" rel="noopener" aria-label={`Open page for ${a.name}`}>Open</Button>}
                <Button variant="outlined" size="small" aria-label={`Copy for ${a.name}`} onClick={async () => setCopied((await copy(a.message)) ? `Copied for ${a.name}` : "Couldn't copy")}>
                  Copy
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, wordBreak: 'break-word' }} data-testid="ask-message">{a.message}</Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={async () => setCopied((await copy(all)) ? 'Copied' : "Couldn't copy")}>Copy all</Button>
        <Button variant="contained" onClick={onClose}>Done</Button>
      </DialogActions>
      <Snackbar open={!!copied} autoHideDuration={2500} onClose={() => setCopied(null)} message={copied} />
    </Dialog>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" component="p" sx={{ fontWeight: 500 }}>{label}</Typography>
      <Typography variant="body1">{children}</Typography>
    </Box>
  );
}

export function TaskDetail() {
  const { taskId } = useParams();
  const { path, org } = useOrg();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const { data, error, reload } = useLoad(() => api(path(`/tasks/${taskId}`)), [taskId]);
  const [picking, setPicking] = useState<Set<string> | null>(null);
  const [sent, setSent] = useState<NewAsk[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  if (!data) return <Loading error={error} />;
  const { task } = data;
  const fits = data.candidates.filter((c: any) => !c.reason);
  const notFit = data.candidates.filter((c: any) => c.reason && c.reason !== 'already_asked');

  async function act(fn: () => Promise<unknown>) {
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

  async function ask() {
    setBusy(true);
    try {
      const res = await api(path(`/tasks/${taskId}/ask`), { body: { volunteerIds: [...picking!] } });
      setPicking(null);
      setSent(res.asks);
      if (res.skipped.length) setProblem(`${res.skipped.length} skipped`);
      await reload();
    } catch (e) {
      setProblem(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancelTask() {
    const ok = await dialogs.confirm({
      title: 'Cancel this task?',
      confirm: 'Cancel task',
      cancel: 'Go back',
      destructive: true,
    });
    if (ok) await act(() => api(path(`/tasks/${taskId}/cancel`), { body: {} }));
  }

  const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;
  const startLabel = task.askMode === 'hand' ? 'Select people' : `Ask ${people(data.nextGroup.length)}`;
  const canAsk = task.status === 'open' && data.openSpots > 0;
  const editable = ['draft', 'open', 'filled'].includes(task.status);

  return (
    <Page
      title={task.title}
      subtitle={<StatusBadge label={STATUS_TEXT[task.status]} tone={STATUS_TONE[task.status]} />}
      back={<Button size="small" startIcon={<BackIcon fontSize="small" />} onClick={() => navigate('..', { relative: 'path' })} sx={{ color: 'text.secondary', ml: -1 }}>Tasks</Button>}
      action={
        <>
          {editable && <Button variant="outlined" onClick={() => navigate('edit')}>Edit</Button>}
          {task.status === 'draft' && <Button variant="contained" disabled={busy} onClick={() => act(() => api(path(`/tasks/${taskId}/open`), { body: {} }))}>Publish</Button>}
          {canAsk && (
            <Button variant="contained" disabled={busy || fits.length === 0} onClick={() => setPicking(new Set(data.nextGroup))}>
              {fits.length === 0 ? 'No eligible people' : startLabel}
            </Button>
          )}
        </>
      }
    >
      <Stack spacing={2}>
        {problem && <Alert severity="warning" onClose={() => setProblem(null)}>{problem}</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 2, alignItems: 'start' }}>
          <Stack spacing={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Detail label="When">{when(task, org.timeZone)}</Detail>
                  {task.placePublic && <Detail label="Location">{task.placePublic}</Detail>}
                  {task.placePrivate && <Detail label="Address">{task.placePrivate}</Detail>}
                  {task.contact && <Detail label="Contact">{task.contact}</Detail>}
                </Box>
                {task.description && <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{task.description}</Typography>}
                {data.requirementLines.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" component="p" sx={{ fontWeight: 500, mb: 0.75 }}>Requirements</Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      {data.requirementLines.map((r: string) => <Chip key={r} label={r} />)}
                    </Stack>
                  </Box>
                )}
                {(task.bring || task.files.length > 0 || task.remote || task.effortMinutes) && (
                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 2 }}>
                    {task.remote && <Chip label="Remote" />}
                    {task.effortMinutes && <Chip label={`About ${effortText(task.effortMinutes)}`} />}
                    {task.bring && <Chip label={`Bring: ${task.bring}`} />}
                    {task.files.map((f: any) => <Chip key={f.url} label={f.name} component="a" href={f.url} target="_blank" rel="noopener" clickable />)}
                  </Stack>
                )}
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{data.holding} of {task.peopleNeeded} confirmed</Typography>
                  {canAsk && task.askMode === 'few' && !data.roundDue && <Typography variant="body2" color="text.secondary">Awaiting replies</Typography>}
                </Stack>
                <SpotBar filled={data.holding} total={task.peopleNeeded} label="Spots filled" />
                {data.spots.filter((x: any) => x.status === 'holding').length > 0 && (
                  <Stack spacing={1} sx={{ mt: 1.5 }}>
                    {data.spots.filter((x: any) => x.status === 'holding').map((x: any) => (
                      <Stack key={x.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Initials name={x.name} size={26} />
                        <Typography variant="body2">{x.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{day(x.created_at, org.timeZone)}, {time(x.created_at, org.timeZone)}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {data.atproto.error && <Alert severity="error">Not posted: {data.atproto.error}</Alert>}
            {!data.atproto.error && data.atproto.uri && (
              <Alert severity="info">
                <span title={data.atproto.uri}>Posted on AT Protocol</span>
                {data.publicUrl && <> · <Link href={data.publicUrl} target="_blank" rel="noopener">View public page</Link></>}
              </Alert>
            )}

            {['open', 'filled'].includes(task.status) && <Box><Button color="error" disabled={busy} onClick={cancelTask}>Cancel task</Button></Box>}
            {task.status === 'draft' && (
              <Box>
                <Button color="error" onClick={() => act(async () => { await api(path(`/tasks/${taskId}`), { method: 'DELETE' }); navigate('..', { relative: 'path' }); })}>Delete draft</Button>
              </Box>
            )}
          </Stack>

          <Stack spacing={2}>
            {(data.batches.length > 0 || data.nextBatch) && (
              <Card>
                <CardContent>
                  <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Batches</Typography>
                  <Box sx={{ position: 'relative', pl: 3.5, '&::before': { content: '""', position: 'absolute', left: 10, top: 10, bottom: 10, width: 2, bgcolor: (t) => t.vt.border } }}>
                    {data.batches.map((b: any) => (
                      <Box key={b.no} sx={{ position: 'relative', py: 0.75 }}>
                        <Box sx={{ position: 'absolute', left: -28, top: 8, display: 'flex', bgcolor: 'background.paper', color: b.waiting ? 'primary.main' : 'success.main' }}>
                          {b.waiting ? <PendingIcon fontSize="small" /> : <DoneIcon fontSize="small" />}
                        </Box>
                        <Typography variant="h3">Batch {b.no} · {b.asked} asked</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {day(b.at, org.timeZone)}, {time(b.at, org.timeZone)} · {[b.yes && `${b.yes} accepted`, b.declined && `${b.declined} declined`, b.waiting && `${b.waiting} pending`, b.noReply && `${b.noReply} expired`].filter(Boolean).join(', ')}
                        </Typography>
                      </Box>
                    ))}
                    {data.nextBatch && (
                      <Box sx={{ position: 'relative', py: 0.75 }}>
                        <Box sx={{ position: 'absolute', left: -28, top: 8, display: 'flex', bgcolor: 'background.paper', color: 'text.disabled' }}><ScheduleIcon fontSize="small" /></Box>
                        <Typography variant="h3">Batch {data.batches.length + 1} · {data.nextBatch.fits} eligible</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {data.nextBatch.at && data.nextBatch.at > Date.now() ? `${day(data.nextBatch.at, org.timeZone)}, ${time(data.nextBatch.at, org.timeZone)}` : 'Ready now'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}
            {canAsk && (data.options.canSplit || data.options.partners.length > 0) && (
              <Card>
                <Typography variant="h2" component="h2" sx={{ px: 2.5, pt: 2, pb: 1 }}>Options</Typography>
                {data.options.canSplit && (
                  <ListItemButton disabled={busy} onClick={() => act(async () => { await api(path(`/tasks/${taskId}/split`), { body: { parts: 2 } }); setShared('Split into 2 shifts'); })} sx={{ borderRadius: 0, px: 2.5, gap: 1.5 }}>
                    <IconTile icon={<SplitIcon />} />
                    <ListItemText primary="Split into 2 shifts" secondary={data.options.splitFits ? `${data.options.splitFits} more eligible` : undefined} />
                  </ListItemButton>
                )}
                {data.options.partners.map((p: any) => (
                  <ListItemButton key={p.id} disabled={busy} onClick={() => act(async () => { await api(path(`/tasks/${taskId}/share`), { body: { partnerOrgId: p.id } }); setShared(`Sent to ${p.name.replace(/^Sample: /, '')}`); })} sx={{ borderRadius: 0, px: 2.5, gap: 1.5 }}>
                    <IconTile icon={<HubIcon />} />
                    <ListItemText primary={`Share with ${p.name.replace(/^Sample: /, '')}`} secondary={`Partner · ${p.active} active volunteers`} />
                  </ListItemButton>
                ))}
                <Box sx={{ height: 8 }} />
              </Card>
            )}
            <Card>
              <CardContent>
                <Typography variant="h2" component="h2">Volunteers</Typography>
                {data.spots.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>No one yet</Typography> : (
                  <List disablePadding>
                    {data.spots.map((s: any) => (
                      <ListItem key={s.id} disableGutters secondaryAction={
                        s.status === 'done' ? <Button size="small" onClick={() => act(() => api(path(`/spots/${s.id}/missed`), { body: {} }))}>Mark no-show</Button> :
                        s.status === 'missed' ? <Button size="small" onClick={() => act(() => api(path(`/spots/${s.id}/missed`), { body: { missed: false } }))}>Mark attended</Button> : null
                      }>
                        <ListItemText primary={s.name} secondary={SPOT_STATUS[s.status]} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="h2" component="h2">Asked</Typography>
                {data.asks.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>No one yet</Typography> : (
                  <List disablePadding>
                    {data.asks.map((a: any) => (
                      <ListItem key={a.id} disableGutters secondaryAction={
                        ['waiting', 'yes'].includes(a.status)
                          ? <Button size="small" onClick={() => act(async () => setSent([await api(path(`/asks/${a.id}/link`), { body: {} })]))}>Reset link</Button>
                          : null
                      }>
                        <ListItemText primary={a.name} secondary={ASK_STATUS[a.status]} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Stack>

      {picking && (
        <Dialog open fullWidth maxWidth="sm" onClose={() => setPicking(null)}>
          <DialogTitle>Select people</DialogTitle>
          <DialogContent>
            <List>
              {fits.map((c: any) => (
                <ListItemButton key={c.id} onClick={() => { const n = new Set(picking); n.has(c.id) ? n.delete(c.id) : n.add(c.id); setPicking(n); }}>
                  <ListItemIcon sx={{ minWidth: 36 }}><Checkbox edge="start" size="small" checked={picking.has(c.id)} tabIndex={-1} slotProps={{ input: { 'aria-label': c.name } }} /></ListItemIcon>
                  <ListItemText primary={c.name} secondary={c.standing} />
                </ListItemButton>
              ))}
            </List>
            {notFit.length > 0 && (
              <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: (t) => t.vt.subtle }}>
                <Typography variant="h3">Not eligible</Typography>
                {Object.entries(notFit.reduce((g: Record<string, any[]>, c: any) => ({ ...g, [c.reason]: [...(g[c.reason] ?? []), c] }), {})).map(([reason, list]) => (
                  <Typography key={reason} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    <strong>{REASON_TEXT[reason] ?? reason}:</strong> {(list as any[]).map((c) => c.name).join(', ')}
                  </Typography>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Typography variant="body2" sx={{ flex: 1 }} color="text.secondary">{picking.size} of {fits.length} selected</Typography>
            <Button variant="outlined" onClick={() => setPicking(null)}>Cancel</Button>
            <Button variant="contained" disabled={busy || picking.size === 0} onClick={ask}>Ask {people(picking.size)}</Button>
          </DialogActions>
        </Dialog>
      )}
      {sent && <CopyList asks={sent} onClose={() => setSent(null)} />}
      <Snackbar open={!!shared} autoHideDuration={3000} onClose={() => setShared(null)} message={shared} />
    </Page>
  );
}
