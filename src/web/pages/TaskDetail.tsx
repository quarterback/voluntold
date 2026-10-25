import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  LinearProgress, Link, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Snackbar, Stack, Typography,
} from '@mui/material';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Loading, Page, errorText, useLoad } from './common';
import { REASON_TEXT, STATUS_TEXT, when } from '../format';

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

/** The links to send, one per person, with Copy buttons. */
export function CopyList({ asks, onClose }: { asks: NewAsk[]; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const all = asks.map((a) => a.message).join('\n\n');
  return (
    <Dialog open fullWidth maxWidth="sm" onClose={onClose}>
      <DialogTitle>Send {asks.length === 1 ? 'this link' : `${asks.length} links`}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Paste each message wherever you reach that person. Links show only once.
        </Typography>
        <Stack spacing={1.5} divider={<Divider />}>
          {asks.map((a) => (
            <Box key={a.askId}>
              <Typography variant="h3">{a.name}</Typography>
              <Typography color="text.secondary" variant="body2">{[a.email, a.phone].filter(Boolean).join(' · ')}</Typography>
              <Typography variant="body2" sx={{ my: 0.75, wordBreak: 'break-word' }} data-testid="ask-message">{a.message}</Typography>
              <Button variant="outlined" size="small" aria-label={`Copy message for ${a.name}`} onClick={async () => setCopied((await copy(a.message)) ? `Copied for ${a.name}` : 'Select the text to copy it')}>
                Copy
              </Button>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={async () => setCopied((await copy(all)) ? 'Copied all' : 'Select the text to copy it')}>Copy all</Button>
        <Button variant="contained" onClick={onClose}>Done</Button>
      </DialogActions>
      <Snackbar open={!!copied} autoHideDuration={2500} onClose={() => setCopied(null)} message={copied} />
    </Dialog>
  );
}

export function TaskDetail() {
  const { taskId } = useParams();
  const { path, org } = useOrg();
  const navigate = useNavigate();
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
      if (res.skipped.length) setProblem(`${res.skipped.length} skipped: they no longer fit.`);
      await reload();
    } catch (e) {
      setProblem(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function newLink(askId: string) {
    await act(async () => setSent([await api(path(`/asks/${askId}/link`), { body: {} })]));
  }

  const startLabel = task.askMode === 'hand' ? 'Choose people' : `Ask ${data.nextGroup.length}`;
  const canAsk = task.status === 'open' && data.openSpots > 0;

  return (
    <Page title={task.title}>
      <Stack spacing={1.5}>
        {problem && <Alert severity="warning" onClose={() => setProblem(null)}>{problem}</Alert>}
        <Card>
          <CardContent>
            <Typography>{when(task)}</Typography>
            {(task.placePublic || task.placePrivate) && <Typography variant="body2" color="text.secondary">{[task.placePublic, task.placePrivate].filter(Boolean).join(', ')}</Typography>}
            {task.description && <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{task.description}</Typography>}
            {data.requirementLines.length > 0 && (
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
                {data.requirementLines.map((r: string) => <Chip key={r} label={r} size="small" variant="outlined" />)}
              </Stack>
            )}
            <Typography variant="body2" sx={{ mt: 1.5 }}>
              {STATUS_TEXT[task.status]} · {data.holding} of {task.peopleNeeded} said yes
            </Typography>
            <LinearProgress variant="determinate" value={Math.min(100, (data.holding / task.peopleNeeded) * 100)} sx={{ mt: 1 }} aria-label="Spots taken" />
          </CardContent>
        </Card>

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {task.status === 'draft' && <Button variant="contained" disabled={busy} onClick={() => act(() => api(path(`/tasks/${taskId}/open`), { body: {} }))}>Open task</Button>}
          {canAsk && (
            <Button variant="contained" disabled={busy || fits.length === 0} onClick={() => setPicking(new Set(data.nextGroup))}>
              {fits.length === 0 ? 'No one left to ask' : startLabel}
            </Button>
          )}
          {['draft', 'open', 'filled'].includes(task.status) && <Button variant="outlined" onClick={() => navigate('edit')}>Edit</Button>}
          {['open', 'filled'].includes(task.status) && (
            <Button color="error" disabled={busy} onClick={() => confirm("Cancel this task? People who said yes will see it's canceled.") && act(() => api(path(`/tasks/${taskId}/cancel`), { body: {} }))}>Cancel task</Button>
          )}
          {task.status === 'draft' && <Button color="error" onClick={() => act(async () => { await api(path(`/tasks/${taskId}`), { method: 'DELETE' }); navigate('..', { relative: 'path' }); })}>Delete draft</Button>}
        </Stack>
        {canAsk && task.askMode === 'few' && !data.roundDue && (
          <Typography variant="body2" color="text.secondary">Waiting on answers. Today will say when to ask more.</Typography>
        )}

        {task.publish && (
          <Alert severity={data.atproto.error ? 'error' : 'info'}>
            {data.atproto.error
              ? `Not posted: ${data.atproto.error}. It tries again when the task changes.`
              : data.atproto.uri
                ? <span title={data.atproto.uri}>Posted on AT Protocol.</span>
                : org.atproto ? 'Posts when you open it.' : 'Connect an account in Settings to post it.'}
            {data.publicUrl && <> <Link href={data.publicUrl} target="_blank" rel="noopener">Public page</Link></>}
          </Alert>
        )}

        <Box>
          <Typography variant="h2" component="h2">Said yes</Typography>
          {data.spots.length === 0 ? <Typography variant="body2" color="text.secondary">No one yet.</Typography> : (
            <List dense disablePadding>
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
        </Box>

        <Box>
          <Typography variant="h2" component="h2">Asked</Typography>
          {data.asks.length === 0 ? <Typography variant="body2" color="text.secondary">No one yet.</Typography> : (
            <List dense disablePadding>
              {data.asks.map((a: any) => (
                <ListItem key={a.id} disableGutters secondaryAction={
                  ['waiting', 'yes'].includes(a.status) ? <Button size="small" onClick={() => newLink(a.id)}>New link</Button> : null
                }>
                  <ListItemText primary={a.name} secondary={ASK_STATUS[a.status]} />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Stack>

      {picking && (
        <Dialog open fullWidth maxWidth="sm" onClose={() => setPicking(null)}>
          <DialogTitle>Who to ask</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">People who fit, longest wait first.</Typography>
            <List dense>
              {fits.map((c: any) => (
                <ListItemButton key={c.id} onClick={() => { const n = new Set(picking); n.has(c.id) ? n.delete(c.id) : n.add(c.id); setPicking(n); }}>
                  <ListItemIcon><Checkbox edge="start" checked={picking.has(c.id)} tabIndex={-1} slotProps={{ input: { 'aria-label': c.name } }} /></ListItemIcon>
                  <ListItemText primary={c.name} secondary={c.standing} />
                </ListItemButton>
              ))}
            </List>
            {notFit.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="h3">Can't ask</Typography>
                {Object.entries(notFit.reduce((g: Record<string, any[]>, c: any) => ({ ...g, [c.reason]: [...(g[c.reason] ?? []), c] }), {})).map(([reason, people]) => (
                  <Typography key={reason} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    <strong>{REASON_TEXT[reason] ?? reason}:</strong> {(people as any[]).map((c) => c.name).join(', ')}
                  </Typography>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Typography variant="body2" sx={{ flex: 1, pl: 2 }} color="text.secondary">{picking.size} of {fits.length}</Typography>
            <Button onClick={() => setPicking(null)}>Cancel</Button>
            <Button variant="contained" disabled={busy || picking.size === 0} onClick={ask}>Ask {picking.size}</Button>
          </DialogActions>
        </Dialog>
      )}
      {sent && <CopyList asks={sent} onClose={() => setSent(null)} />}
    </Page>
  );
}
