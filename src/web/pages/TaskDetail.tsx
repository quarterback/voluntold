import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  LinearProgress, Link, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Snackbar, Stack, Typography,
} from '@mui/material';
import BackIcon from '@mui/icons-material/ArrowBack';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Loading, Page, StatusBadge, errorText, useDialogs, useLoad } from './common';
import { REASON_TEXT, STATUS_TEXT, when } from '../format';
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
  waiting: 'No answer yet',
  yes: 'Said yes',
  no: 'Said no',
  expired: "Didn't answer",
  closed: 'Filled first',
};

const SPOT_STATUS: Record<string, string> = {
  holding: 'Coming',
  cant: "Can't make it",
  done: 'Done',
  missed: 'Missed',
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
  const [copied, setCopied] = useState<string | null>(null);
  const all = asks.map((a) => a.message).join('\n\n');
  return (
    <Dialog open fullWidth maxWidth="sm" onClose={onClose}>
      <DialogTitle>Send {asks.length === 1 ? 'this link' : `${asks.length} links`}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          {asks.map((a) => (
            <Box key={a.askId} sx={{ border: (t) => `1px solid ${t.vt.border}`, borderRadius: 2, p: 1.5 }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h3">{a.name}</Typography>
                  <Typography variant="caption" noWrap component="p">{[a.email, a.phone].filter(Boolean).join(' · ')}</Typography>
                </Box>
                <Button variant="outlined" size="small" aria-label={`Copy message for ${a.name}`} onClick={async () => setCopied((await copy(a.message)) ? `Copied for ${a.name}` : 'Select the text to copy it')}>
                  Copy message
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, wordBreak: 'break-word' }} data-testid="ask-message">{a.message}</Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={async () => setCopied((await copy(all)) ? 'Copied all messages' : 'Select the text to copy it')}>Copy all messages</Button>
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
  const { path } = useOrg();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const { data, error, reload } = useLoad(() => api(path(`/tasks/${taskId}`)), [taskId]);
  const [picking, setPicking] = useState<Set<string> | null>(null);
  const [sent, setSent] = useState<NewAsk[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      cancel: 'Keep task',
      destructive: true,
    });
    if (ok) await act(() => api(path(`/tasks/${taskId}/cancel`), { body: {} }));
  }

  const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;
  const startLabel = task.askMode === 'hand' ? 'Choose people' : `Ask ${people(data.nextGroup.length)}`;
  const canAsk = task.status === 'open' && data.openSpots > 0;
  const editable = ['draft', 'open', 'filled'].includes(task.status);

  return (
    <Page
      title={task.title}
      subtitle={<StatusBadge label={STATUS_TEXT[task.status]} tone={STATUS_TONE[task.status]} />}
      back={<Button size="small" startIcon={<BackIcon fontSize="small" />} onClick={() => navigate('..', { relative: 'path' })} sx={{ color: 'text.secondary', ml: -1 }}>Tasks</Button>}
      action={
        <>
          {editable && <Button variant="outlined" onClick={() => navigate('edit')}>Edit task</Button>}
          {task.status === 'draft' && <Button variant="contained" disabled={busy} onClick={() => act(() => api(path(`/tasks/${taskId}/open`), { body: {} }))}>Open task</Button>}
          {canAsk && (
            <Button variant="contained" disabled={busy || fits.length === 0} onClick={() => setPicking(new Set(data.nextGroup))}>
              {fits.length === 0 ? 'No one left to ask' : startLabel}
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
                  <Detail label="When">{when(task)}</Detail>
                  {task.placePublic && <Detail label="Place">{task.placePublic}</Detail>}
                  {task.placePrivate && <Detail label="Address">{task.placePrivate}</Detail>}
                  {task.contact && <Detail label="Who to find">{task.contact}</Detail>}
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
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{data.holding} of {task.peopleNeeded} said yes</Typography>
                  {canAsk && task.askMode === 'few' && !data.roundDue && <Typography variant="body2" color="text.secondary">Waiting on answers</Typography>}
                </Stack>
                <LinearProgress variant="determinate" value={Math.min(100, (data.holding / task.peopleNeeded) * 100)} aria-label="Spots taken" />
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
            <Card>
              <CardContent>
                <Typography variant="h2" component="h2">Said yes</Typography>
                {data.spots.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>No one yet</Typography> : (
                  <List disablePadding>
                    {data.spots.map((s: any) => (
                      <ListItem key={s.id} disableGutters secondaryAction={
                        s.status === 'done' ? <Button size="small" onClick={() => act(() => api(path(`/spots/${s.id}/missed`), { body: {} }))}>Mark missed</Button> :
                        s.status === 'missed' ? <Button size="small" onClick={() => act(() => api(path(`/spots/${s.id}/missed`), { body: { missed: false } }))}>Mark done</Button> : null
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
                          ? <Button size="small" onClick={() => act(async () => setSent([await api(path(`/asks/${a.id}/link`), { body: {} })]))}>Get new link</Button>
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
          <DialogTitle>Who to ask</DialogTitle>
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
                <Typography variant="h3">Can't ask</Typography>
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
    </Page>
  );
}
