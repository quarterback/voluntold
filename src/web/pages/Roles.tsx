import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Autocomplete, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItem, ListItemButton,
  ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BackIcon from '@mui/icons-material/ArrowBack';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { EmptyState, Loading, Page, Section, StatusBadge, errorText, useDialogs, useLoad, type Tone } from './common';
import { dateInput } from './membership';

const DAY = 24 * 60 * 60 * 1000;
const ENDING_SOON = 60 * DAY;

interface Term {
  id: string;
  volunteerId: string;
  name: string;
  startsAt: number;
  endsAt: number | null;
  endedAt: number | null;
}

interface RoleRow {
  id: string;
  name: string;
  teamId: string | null;
  holder: Term | null;
  pastHolders: number;
  openTasks: number;
}

const md = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Vacant, ending soon, or nothing to act on. */
function roleBadge(r: Pick<RoleRow, 'holder'>): [string, Tone] | null {
  if (!r.holder) return ['Vacant', 'warning'];
  if (r.holder.endsAt !== null && r.holder.endsAt - Date.now() < ENDING_SOON) return ['Ending soon', 'info'];
  return null;
}

/** Vacant roles first, then terms ending soonest, then the rest by name. */
function order(a: RoleRow, b: RoleRow): number {
  const rank = (r: RoleRow) => (!r.holder ? 0 : r.holder.endsAt !== null && r.holder.endsAt - Date.now() < ENDING_SOON ? 1 : 2);
  return rank(a) - rank(b) || (a.holder?.endsAt ?? Infinity) - (b.holder?.endsAt ?? Infinity) || a.name.localeCompare(b.name);
}

export function Roles() {
  const { path, me, teams } = useOrg();
  const navigate = useNavigate();
  const { data, error, reload } = useLoad(() => api<{ roles: RoleRow[] }>(path('/roles')), [path]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  if (!data) return <Loading error={error} />;
  const canEdit = me.role !== 'lead';
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  async function add() {
    setProblem(null);
    try {
      const res = await api<{ id: string }>(path('/roles'), { body: { name } });
      setAdding(false);
      setName('');
      navigate(res.id);
    } catch (err) {
      setProblem(errorText(err));
    }
  }

  return (
    <Page title="Roles" action={canEdit && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAdding(true)}>Add role</Button>}>
      {data.roles.length === 0 ? (
        <EmptyState title="No roles yet" action={canEdit && <Button variant="contained" onClick={() => setAdding(true)}>Add role</Button>} />
      ) : (
        <Card>
          <List disablePadding>
            {[...data.roles].sort(order).map((r, i) => {
              const badge = roleBadge(r);
              return (
                <Box key={r.id}>
                  {i > 0 && <Divider />}
                  <ListItemButton onClick={() => navigate(r.id)} sx={{ py: 1.5, gap: 1 }}>
                    <ListItemText
                      primary={r.name}
                      secondary={[
                        r.holder ? r.holder.name : null,
                        r.holder?.endsAt ? `until ${md(r.holder.endsAt)}` : null,
                        r.teamId ? teamName.get(r.teamId) : null,
                        r.openTasks ? `${r.openTasks} open ${r.openTasks === 1 ? 'task' : 'tasks'}` : null,
                      ].filter(Boolean).join(' · ')}
                    />
                    {badge && <StatusBadge label={badge[0]} tone={badge[1]} />}
                  </ListItemButton>
                </Box>
              );
            })}
          </List>
        </Card>
      )}
      <Dialog open={adding} onClose={() => setAdding(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add role</DialogTitle>
        <DialogContent>
          {problem && <Alert severity="error" sx={{ mb: 2 }}>{problem}</Alert>}
          <TextField label="Role name" placeholder="Treasurer" autoFocus fullWidth sx={{ mt: 1 }} value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) add(); }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdding(false)}>Cancel</Button>
          <Button variant="contained" disabled={!name.trim()} onClick={add}>Add role</Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}

interface RoleDetail {
  role: { id: string; name: string; teamId: string | null; responsibilities: string; handoff: string };
  holder: Term | null;
  history: Term[];
  openTasks: { id: string; title: string; status: string; startsAt: number | null; dueAt: number | null }[];
}

/** One role: who holds it, what it's responsible for, and what the next person inherits. */
export function RoleDetail() {
  const { roleId } = useParams();
  const { path, me } = useOrg();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const { data, error, reload } = useLoad(() => api<RoleDetail>(path(`/roles/${roleId}`)), [roleId]);
  const people = useLoad(() => api<{ volunteers: { id: string; name: string }[] }>(path('/volunteers')), [path]);
  const [form, setForm] = useState<{ name: string; responsibilities: string; handoff: string } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (data) setForm({ name: data.role.name, responsibilities: data.role.responsibilities, handoff: data.role.handoff });
  }, [data]);
  if (!data || !form) return <Loading error={error} />;
  const canEdit = me.role !== 'lead';
  const badge = roleBadge(data);

  async function run(fn: () => Promise<unknown>) {
    setProblem(null);
    try {
      await fn();
      await reload();
      return true;
    } catch (err) {
      setProblem(errorText(err));
      return false;
    }
  }

  return (
    <Page
      title={data.role.name}
      subtitle={badge && <StatusBadge label={badge[0]} tone={badge[1]} />}
      back={<Button size="small" startIcon={<BackIcon fontSize="small" />} onClick={() => navigate('..', { relative: 'path' })} sx={{ color: 'text.secondary', ml: -1 }}>Roles</Button>}
      action={canEdit && <Button variant="contained" onClick={async () => { if (await run(() => api(path(`/roles/${data.role.id}`), { method: 'PATCH', body: form }))) setSaved(true); }}>Save</Button>}
    >
      <Stack spacing={2}>
        {problem && <Alert severity="error">{problem}</Alert>}
        {saved && <Alert severity="success" onClose={() => setSaved(false)}>Saved</Alert>}
        <Section title="Held by">
          {data.holder ? (
            <Stack spacing={1}>
              <Typography variant="h3">
                <Box component="a" href={`../people/${data.holder.volunteerId}`} onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate(`../../people/${data.holder!.volunteerId}`, { relative: 'path' }); }} sx={{ color: 'inherit' }}>{data.holder.name}</Box>
              </Typography>
              <Typography variant="body2" color="text.secondary">Since {md(data.holder.startsAt)}{data.holder.endsAt ? ` · until ${md(data.holder.endsAt)}` : ''}</Typography>
              {canEdit && (
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', pt: 1 }}>
                  <TextField label="Term ends" type="date" size="small" value={dateInput(data.holder.endsAt)} slotProps={{ inputLabel: { shrink: true } }}
                    onChange={(e) => run(() => api(path(`/roles/${data.role.id}/term`), { method: 'PATCH', body: { endsAt: e.target.value } }))} />
                  <Button variant="outlined" onClick={() => setAssigning(true)}>Hand off</Button>
                  <Button color="error" onClick={async () => {
                    if (await dialogs.confirm({ title: `End ${data.holder!.name}'s term?`, confirm: 'End term', destructive: true })) run(() => api(path(`/roles/${data.role.id}/vacate`), { body: {} }));
                  }}>End term</Button>
                </Stack>
              )}
            </Stack>
          ) : (
            canEdit ? <Button variant="contained" onClick={() => setAssigning(true)}>Assign</Button> : <Typography color="text.secondary">Vacant</Typography>
          )}
        </Section>

        <Section title="Responsibilities">
          <TextField multiline minRows={3} fullWidth disabled={!canEdit} value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
            slotProps={{ htmlInput: { 'aria-label': 'Responsibilities' } }} />
        </Section>

        <Section title="Handoff notes">
          <TextField multiline minRows={3} fullWidth disabled={!canEdit} value={form.handoff} onChange={(e) => setForm({ ...form, handoff: e.target.value })}
            slotProps={{ htmlInput: { 'aria-label': 'Handoff notes' } }} />
        </Section>

        <Section title="Open tasks">
          {data.openTasks.length === 0 ? <Typography color="text.secondary">None</Typography> : (
            <List disablePadding>
              {data.openTasks.map((t) => (
                <ListItemButton key={t.id} onClick={() => navigate(`../../tasks/${t.id}`, { relative: 'path' })} sx={{ px: 0 }}>
                  <ListItemText primary={t.title} secondary={[t.startsAt ? md(t.startsAt) : t.dueAt ? `by ${md(t.dueAt)}` : null, t.status].filter(Boolean).join(' · ')} />
                </ListItemButton>
              ))}
            </List>
          )}
        </Section>

        <Section title="Previous holders">
          {data.history.length === 0 ? <Typography color="text.secondary">None</Typography> : (
            <List disablePadding>
              {data.history.map((t) => (
                <ListItem key={t.id} sx={{ px: 0 }}>
                  <ListItemText primary={t.name} secondary={`${md(t.startsAt)} to ${md(t.endedAt!)}`} />
                </ListItem>
              ))}
            </List>
          )}
        </Section>

        {canEdit && (
          <Box>
            <Button color="error" onClick={async () => {
              if (await dialogs.confirm({ title: `Delete ${data.role.name}?`, confirm: 'Delete role', destructive: true })) {
                if (await run(() => api(path(`/roles/${data.role.id}`), { method: 'DELETE' }))) navigate('..', { relative: 'path' });
              }
            }}>Delete role</Button>
          </Box>
        )}
      </Stack>
      {assigning && (
        <AssignDialog people={people.data?.volunteers ?? []} handoff={!!data.holder} onClose={() => setAssigning(false)}
          onAssign={async (body) => { if (await run(() => api(path(`/roles/${data.role.id}/assign`), { body }))) setAssigning(false); }} />
      )}
    </Page>
  );
}

function AssignDialog({ people, handoff, onClose, onAssign }: {
  people: { id: string; name: string }[];
  handoff: boolean;
  onClose: () => void;
  onAssign: (body: { volunteerId: string; startsAt: string; endsAt: string }) => void;
}) {
  const [person, setPerson] = useState<{ id: string; name: string } | null>(null);
  const [startsAt, setStartsAt] = useState(dateInput(Date.now()));
  const [endsAt, setEndsAt] = useState('');
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{handoff ? 'Hand off role' : 'Assign role'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Autocomplete options={people} getOptionLabel={(p) => p.name} value={person} onChange={(_, v) => setPerson(v)}
            renderInput={(params) => <TextField {...params} label="Person" />} />
          <TextField label="Starts" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Term ends" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!person} onClick={() => onAssign({ volunteerId: person!.id, startsAt, endsAt })}>{handoff ? 'Hand off' : 'Assign'}</Button>
      </DialogActions>
    </Dialog>
  );
}
