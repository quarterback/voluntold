import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, IconButton, InputLabel, ListItemButton,
  MenuItem, Select, Snackbar, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import BackIcon from '@mui/icons-material/ArrowBack';
import ChevronIcon from '@mui/icons-material/ChevronRight';
import SupplyIcon from '@mui/icons-material/Inventory2Outlined';
import InfoIcon from '@mui/icons-material/DescriptionOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import PersonOffIcon from '@mui/icons-material/PersonOffOutlined';
import SplitIcon from '@mui/icons-material/CallSplit';
import HubIcon from '@mui/icons-material/HubOutlined';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { EmptyState, IconTile, Initials, Loading, StatTile, StatusBadge, errorText, useDialogs, useLoad, type Tone } from './common';
import { CopyList } from './TaskDetail';
import { effortText } from '../format';
import { day, timeRange } from '../../shared/time';
import { TagPicker, TagRow } from './tags';

const STATE: Record<string, [string, Tone]> = {
  offer: ['Ready', 'accent'],
  asked: ['Pending', 'info'],
  covered: ['Covered', 'success'],
  gap: ['Gap', 'warning'],
};
const REPEAT: Record<string, string> = { none: '', weekly: 'weekly', monthly: 'monthly' };

function needWhen(n: { startsAt: number | null; repeat: string }, tz: string) {
  return [n.startsAt ? `Starts ${day(n.startsAt, tz)}` : '', REPEAT[n.repeat]].filter(Boolean).join(' · ');
}

function assignmentWhen(a: any, tz: string) {
  const time = a.timing === 'at_time' && a.startsAt ? `${day(a.startsAt, tz)}, ${timeRange(a.startsAt, a.endsAt, tz)}` : a.timing === 'by_date' && a.dueAt ? `By ${day(a.dueAt, tz)}` : '';
  return [a.remote ? 'Remote' : '', time, effortText(a.effortMinutes)].filter(Boolean).join(' · ');
}

export function Needs() {
  const { needId } = useParams();
  const { path, org } = useOrg();
  const navigate = useNavigate();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const { data, error, reload } = useLoad(() => api(path('/needs')), [path]);
  const [editing, setEditing] = useState<any | null>(null);

  if (!data) return <Loading error={error} />;
  const list = (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h1" component="h1">Needs</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({})}>New need</Button>
      </Stack>
      {data.needs.length === 0 ? <EmptyState title="No needs yet" /> : (
        <Card>
          {data.needs.map((n: any, i: number) => {
            const badge: [string, Tone] = n.status === 'done' ? ['Done', 'neutral'] : n.counts.canOffer ? [`${n.counts.canOffer} ready`, 'info'] :
              n.counts.gaps ? [`${n.counts.gaps} gaps`, 'warning'] : [`${n.filled} of ${n.spots} filled`, 'success'];
            return (
              <Box key={n.id}>
                {i > 0 && <Divider />}
                <ListItemButton selected={n.id === needId} onClick={() => navigate(`/o/${org.id}/needs/${n.id}`)}
                  sx={{ borderRadius: 0, px: 2, py: 1.5, gap: 1.5, '&.Mui-selected': { bgcolor: (t) => t.vt.accentSoft } }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h3" component="h2" noWrap>{n.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{needWhen(n, org.timeZone) || `${n.counts.assignments} assignments`}</Typography>
                    <TagRow tagIds={n.tags ?? []} max={3} sx={{ mt: 0.5 }} />
                  </Box>
                  <StatusBadge label={badge[0]} tone={badge[1]} />
                  {!wide && <ChevronIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
                </ListItemButton>
              </Box>
            );
          })}
        </Card>
      )}
    </Box>
  );

  const editor = editing && (
    <NeedEditor need={editing} onClose={async (id) => {
      setEditing(null);
      if (id) { await reload(); navigate(`/o/${org.id}/needs/${id}`); }
    }} />
  );

  if (wide) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', minHeight: '100vh' }}>
        <Box sx={{ borderRight: (t) => `1px solid ${t.vt.border}`, px: 2.5, py: 4 }}>{list}</Box>
        <Box sx={{ px: 4, py: 4, minWidth: 0 }}>
          {needId ? <NeedDetail key={needId} id={needId} onChanged={reload} onEdit={setEditing} /> : (
            <Typography color="text.secondary" sx={{ mt: 6, textAlign: 'center' }}>Select a need</Typography>
          )}
        </Box>
        {editor}
      </Box>
    );
  }
  return (
    <Box sx={{ px: 2, pt: 2, pb: 11 }}>
      {needId ? (
        <>
          <Button size="small" startIcon={<BackIcon fontSize="small" />} onClick={() => navigate(`/o/${org.id}/needs`)} sx={{ color: 'text.secondary', ml: -1, mb: 1 }}>Needs</Button>
          <NeedDetail key={needId} id={needId} onChanged={reload} onEdit={setEditing} />
        </>
      ) : list}
      {editor}
    </Box>
  );
}

function NeedDetail({ id, onChanged, onEdit }: { id: string; onChanged: () => void; onEdit: (n: any) => void }) {
  const { path, org } = useOrg();
  const navigate = useNavigate();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const { data, error, reload, setData } = useLoad(() => api(path(`/needs/${id}`)), [id]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState<any[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  if (!data) return <Loading error={error} />;
  const { need, assignments, items, counts } = data;
  const tz = org.timeZone;

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setProblem(null);
    try {
      await fn();
      await reload();
      onChanged();
    } catch (e) {
      setProblem(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const offer = () => act(async () => {
    const res = await api(path(`/needs/${id}/offer`), { body: {} });
    if (res.asks.length) setSent(res.asks);
  });

  const actions = (
    <Stack direction="row" spacing={1}>
      <Button variant="outlined" onClick={() => onEdit(need)}>Edit need</Button>
      <Button variant="contained" disabled={busy || counts.canOffer === 0} onClick={offer}>
        {counts.canOffer ? `Offer ${counts.canOffer} ${counts.canOffer === 1 ? 'assignment' : 'assignments'}` : 'Offer assignments'}
      </Button>
    </Stack>
  );

  const assignmentList = (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h2" component="h2">Assignments</Typography>
        <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => navigate(`/o/${org.id}/tasks/new?need=${id}`)}>Add</Button>
      </Stack>
      <Card>
        {assignments.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No assignments yet</Typography>}
        {assignments.map((a: any, i: number) => {
          const [label, tone] = STATE[a.state];
          return (
            <Box key={a.id}>
              {i > 0 && <Divider />}
              <ListItemButton onClick={() => navigate(`/o/${org.id}/tasks/${a.id}`)} sx={{ borderRadius: 0, px: 2, py: 1.5, gap: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h3" component="h3">{a.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{assignmentWhen(a, tz)}</Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.75 }}>
                    {a.state === 'covered' || a.state === 'asked' ? (
                      <Typography variant="body2">{a.holding} of {a.peopleNeeded} confirmed</Typography>
                    ) : a.match ? (
                      <><Initials name={a.match.name} size={26} /><Typography variant="body2">{a.match.name}</Typography>
                        {a.fits > 1 && <Typography variant="body2" color="text.secondary">+{a.fits - 1} eligible</Typography>}</>
                    ) : (
                      <><Box sx={{ color: 'text.disabled', display: 'flex' }}><PersonOffIcon fontSize="small" /></Box><Typography variant="body2" color="text.secondary">No match</Typography></>
                    )}
                  </Stack>
                </Box>
                <StatusBadge label={label} tone={tone} />
              </ListItemButton>
              {a.state === 'gap' && (
                <Box sx={{ px: 2, pb: 1.5, pt: 0.5, bgcolor: (t) => t.vt.subtle }}>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {a.canSplit && (
                      <Button size="small" variant="outlined" startIcon={<SplitIcon fontSize="small" />} disabled={busy}
                        onClick={() => act(() => api(path(`/tasks/${a.id}/split`), { body: { parts: 2 } }))}>Split into 2</Button>
                    )}
                    {data.partners.map((p: any) => (
                      <Button key={p.id} size="small" variant="outlined" startIcon={<HubIcon fontSize="small" />} disabled={busy}
                        onClick={() => act(async () => { await api(path(`/tasks/${a.id}/share`), { body: { partnerOrgId: p.id } }); setShared(p.name.replace(/^Sample: /, '')); })}>
                        {p.name.replace(/^Sample: /, '')} · {p.active} active
                      </Button>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          );
        })}
      </Card>
    </Box>
  );

  const itemList = (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h2" component="h2">Supplies and info</Typography>
        <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => setAdding(true)}>Add</Button>
      </Stack>
      <Card>
        {items.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Nothing listed</Typography>}
        {items.map((it: any, i: number) => (
          <Box key={it.id}>
            {i > 0 && <Divider />}
            <Stack direction="row" spacing={1.5} sx={{ px: 2, py: 1.25, alignItems: 'center' }}>
              <IconTile icon={it.kind === 'info' ? <InfoIcon /> : <SupplyIcon />} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h3" component="h3">{it.title}</Typography>
                {it.detail && <Typography variant="body2" color="text.secondary">{it.detail}</Typography>}
              </Box>
              <Checkbox size="small" checked={it.status === 'covered'} disabled={busy}
                slotProps={{ input: { 'aria-label': `${it.title} covered` } }}
                onChange={(e) => act(() => api(path(`/need-items/${it.id}`), { method: 'PATCH', body: { status: e.target.checked ? 'covered' : 'needed' } }))} />
              <StatusBadge label={it.status === 'covered' ? 'Covered' : 'Needed'} tone={it.status === 'covered' ? 'success' : 'warning'} />
              <IconButton size="small" aria-label={`Remove ${it.title}`} onClick={() => act(() => api(path(`/need-items/${it.id}`), { method: 'DELETE' }))}><DeleteIcon fontSize="small" /></IconButton>
            </Stack>
          </Box>
        ))}
      </Card>
    </Box>
  );

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' }, mb: 2 }}>
        <Box>
          <Typography variant="h1" component="h1">{need.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{needWhen(need, tz) || 'No start date'}</Typography>
          <Box sx={{ mt: 1 }}>
            <TagPicker kind="needs" id={need.id} tagIds={need.tags ?? []} onChanged={(tags) => { setData({ ...data, need: { ...need, tags } }); onChanged(); }} />
          </Box>
        </Box>
        {wide && actions}
      </Stack>
      {problem && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setProblem(null)}>{problem}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mb: 2.5, maxWidth: 520 }}>
        <StatTile label="Ready" value={counts.canOffer} />
        <StatTile label="Gaps" value={counts.gaps} />
        <StatTile label="Eligible" value={counts.fit} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.3fr 1fr' }, gap: 2.5, alignItems: 'start' }}>
        {assignmentList}
        {itemList}
      </Box>
      {!wide && (
        <Box sx={{ position: 'fixed', left: 0, right: 0, bottom: 56, p: 1.5, bgcolor: 'background.paper', borderTop: (t) => `1px solid ${t.vt.border}`, display: 'flex', justifyContent: 'flex-end', zIndex: 5 }}>
          {actions}
        </Box>
      )}
      {!wide && <Box sx={{ height: 72 }} />}
      {adding && <ItemEditor needId={id} onClose={(changed) => { setAdding(false); if (changed) { reload(); onChanged(); } }} />}
      {sent && <CopyList asks={sent} onClose={() => setSent(null)} />}
      <Snackbar open={!!shared} autoHideDuration={3000} onClose={() => setShared(null)} message={shared ? `Sent to ${shared}` : ''} />
    </Box>
  );
}

function NeedEditor({ need, onClose }: { need: any; onClose: (id?: string) => void }) {
  const { path } = useOrg();
  const dialogs = useDialogs();
  const [form, setForm] = useState({
    title: need.title ?? '',
    startsAt: need.startsAt ? new Date(need.startsAt).toISOString().slice(0, 10) : '',
    repeat: need.repeat ?? 'none',
    status: need.status ?? 'draft',
  });
  const [problem, setProblem] = useState<string | null>(null);
  async function save() {
    try {
      const body = { ...form, startsAt: form.startsAt ? `${form.startsAt}T09:00` : null };
      if (need.id) {
        await api(path(`/needs/${need.id}`), { method: 'PATCH', body });
        onClose(need.id);
      } else {
        const res = await api(path('/needs'), { body });
        onClose(res.id);
      }
    } catch (e) {
      setProblem(errorText(e));
    }
  }
  async function remove() {
    const ok = await dialogs.confirm({ title: `Delete ${need.title}?`, confirm: 'Delete need', destructive: true });
    if (!ok) return;
    try {
      await api(path(`/needs/${need.id}`), { method: 'DELETE' });
      onClose();
    } catch (e) {
      setProblem(errorText(e));
    }
  }
  return (
    <Dialog open fullWidth maxWidth="xs" onClose={() => onClose()}>
      <DialogTitle>{need.id ? 'Edit need' : 'New need'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {problem && <Alert severity="error">{problem}</Alert>}
          <TextField label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <TextField label="Starts" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          <Box>
            <Typography component="p" sx={{ fontSize: '0.8125rem', fontWeight: 500, mb: 0.75 }}>Repeats</Typography>
            <ToggleButtonGroup exclusive size="small" value={form.repeat} onChange={(_, v) => v && setForm({ ...form, repeat: v })} aria-label="Repeats">
              <ToggleButton value="none">Once</ToggleButton>
              <ToggleButton value="weekly">Weekly</ToggleButton>
              <ToggleButton value="monthly">Monthly</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {need.id && (
            <FormControl fullWidth>
              <InputLabel id="need-status">Status</InputLabel>
              <Select labelId="need-status" label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="done">Done</MenuItem>
              </Select>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {need.id && <Button color="error" onClick={remove} sx={{ mr: 'auto' }}>Delete</Button>}
        <Button variant="outlined" onClick={() => onClose()}>Cancel</Button>
        <Button variant="contained" disabled={!form.title.trim()} onClick={save}>{need.id ? 'Save' : 'Create need'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function ItemEditor({ needId, onClose }: { needId: string; onClose: (changed?: boolean) => void }) {
  const { path } = useOrg();
  const [form, setForm] = useState({ title: '', detail: '', kind: 'supply' });
  const [problem, setProblem] = useState<string | null>(null);
  async function save() {
    try {
      await api(path(`/needs/${needId}/items`), { body: form });
      onClose(true);
    } catch (e) {
      setProblem(errorText(e));
    }
  }
  return (
    <Dialog open fullWidth maxWidth="xs" onClose={() => onClose()}>
      <DialogTitle>Add supply or info</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {problem && <Alert severity="error">{problem}</Alert>}
          <ToggleButtonGroup exclusive size="small" value={form.kind} onChange={(_, v) => v && setForm({ ...form, kind: v })} aria-label="Kind">
            <ToggleButton value="supply">Supply</ToggleButton>
            <ToggleButton value="info">Info</ToggleButton>
          </ToggleButtonGroup>
          <TextField label="Name" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <TextField label="Amount or deadline" value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => onClose()}>Cancel</Button>
        <Button variant="contained" disabled={!form.title.trim()} onClick={save}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}
