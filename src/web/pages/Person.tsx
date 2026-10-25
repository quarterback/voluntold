import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, FormControl, FormControlLabel, FormGroup, InputLabel, List, ListItem,
  ListItemText, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Loading, Page, Section, errorText, useDialogs, useLoad } from './common';
import BackIcon from '@mui/icons-material/ArrowBack';
import { ago, when } from '../format';
import type { Field, FieldValue } from '../../shared/types';

function FieldInput({ field, value, onChange }: { field: Field; value: FieldValue | undefined; onChange: (v: FieldValue) => void }) {
  if (field.type === 'one') {
    return (
      <FormControl fullWidth>
        <InputLabel id={field.id}>{field.label}</InputLabel>
        <Select labelId={field.id} label={field.label} value={String(value ?? '')} onChange={(e) => onChange(e.target.value || null)}>
          <MenuItem value="">Not set</MenuItem>
          {field.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </Select>
      </FormControl>
    );
  }
  if (field.type === 'many') {
    const list = Array.isArray(value) ? value : [];
    return (
      <Box>
        <Typography variant="body2" color="text.secondary">{field.label}</Typography>
        <FormGroup row>
          {field.options.map((o) => (
            <FormControlLabel key={o} label={o} control={<Checkbox checked={list.includes(o)} onChange={(e) => onChange(e.target.checked ? [...list, o] : list.filter((x) => x !== o))} />} />
          ))}
        </FormGroup>
        <TextField size="small" label={`Add to ${field.label}`} onKeyDown={(e) => {
          const input = e.target as HTMLInputElement;
          if (e.key === 'Enter' && input.value.trim()) { e.preventDefault(); onChange([...list, input.value.trim()]); input.value = ''; }
        }} />
      </Box>
    );
  }
  if (field.type === 'yesno') {
    return <FormControlLabel label={field.label} control={<Checkbox checked={value === true} onChange={(e) => onChange(e.target.checked)} />} />;
  }
  return (
    <TextField label={field.label} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={value ?? ''}
      onChange={(e) => onChange(e.target.value)} slotProps={{ inputLabel: { shrink: field.type === 'date' ? true : undefined } }} />
  );
}

export function Person() {
  const { volunteerId } = useParams();
  const { path, fields, teams, me, reload: reloadOrg } = useOrg();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const { data, error, reload } = useLoad(() => api(path(`/volunteers/${volunteerId}`)), [volunteerId]);
  const [form, setForm] = useState<any>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pauseUntil, setPauseUntil] = useState('');
  const [teamIds, setTeamIds] = useState<string[]>([]);

  useEffect(() => {
    if (data) {
      setForm({ name: data.volunteer.name, email: data.volunteer.email ?? '', phone: data.volunteer.phone ?? '', values: data.volunteer.values });
      setTeamIds(data.volunteer.teamIds);
    }
  }, [data]);
  if (!data || !form) return <Loading error={error} />;
  const v = data.volunteer;
  const canEdit = me.role !== 'lead';
  const myTeams = teams.filter((t) => me.role !== 'lead' || me.leadTeamIds.includes(t.id));

  async function run(fn: () => Promise<unknown>, after?: () => void) {
    setProblem(null);
    try {
      await fn();
      after?.();
      await reload();
    } catch (e) {
      setProblem(errorText(e));
    }
  }

  async function stopAsks() {
    const ok = await dialogs.confirm({ title: `Stop asks to ${v.name}?`, confirm: 'Stop asks', destructive: true });
    if (ok) run(() => api(path(`/volunteers/${v.id}`), { method: 'PATCH', body: { status: 'stopped' } }));
  }
  async function deletePerson() {
    const ok = await dialogs.confirm({ title: `Delete ${v.name}?`, body: "This can't be undone.", confirm: 'Delete person', destructive: true });
    if (ok) run(() => api(path(`/volunteers/${v.id}`), { method: 'DELETE' }), () => navigate('..', { relative: 'path' }));
  }
  const ANSWER: Record<string, string> = { waiting: 'No answer yet', yes: 'Said yes', no: 'Said no', expired: "Didn't answer", closed: 'Filled first' };

  return (
    <Page
      title={v.name}
      subtitle={v.standing}
      back={<Button size="small" startIcon={<BackIcon fontSize="small" />} onClick={() => navigate('..', { relative: 'path' })} sx={{ color: 'text.secondary', ml: -1 }}>People</Button>}
      action={canEdit && <Button variant="contained" onClick={() => run(() => api(path(`/volunteers/${v.id}`), { method: 'PATCH', body: form }), () => { setSaved(true); reloadOrg(); })}>Save changes</Button>}
    >
      <Stack spacing={2}>
        {problem && <Alert severity="error">{problem}</Alert>}
        {saved && <Alert severity="success" onClose={() => setSaved(false)}>Changes saved</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 2, alignItems: 'start' }}>
          <Section title="Details">
            <Stack spacing={2}>
              <TextField label="Name" value={form.name} disabled={!canEdit} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Email" value={form.email} disabled={!canEdit} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <TextField label="Phone" value={form.phone} disabled={!canEdit} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Stack>
              {fields.map((f) => (
                <FieldInput key={f.id} field={f} value={form.values[f.id]} onChange={(val) => setForm({ ...form, values: { ...form.values, [f.id]: val } })} />
              ))}
              {v.contactOkAt === null && canEdit && (
                <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => run(() => api(path(`/volunteers/${v.id}`), { method: 'PATCH', body: { contactOk: true } }))}>Mark as agreed</Button>}>
                  Hasn't agreed to be contacted
                </Alert>
              )}
            </Stack>
          </Section>

          <Stack spacing={2}>
            {myTeams.length > 0 && (
              <Section title="Teams">
                <FormGroup>
                  {myTeams.map((t) => (
                    <FormControlLabel key={t.id} label={t.name} control={
                      <Checkbox size="small" checked={teamIds.includes(t.id)} onChange={(e) => {
                        const on = e.target.checked;
                        setTeamIds(on ? [...teamIds, t.id] : teamIds.filter((x) => x !== t.id));
                        run(() => on
                          ? api(path(`/teams/${t.id}/members`), { body: { volunteerId: v.id } })
                          : api(path(`/teams/${t.id}/members/${v.id}`), { method: 'DELETE' }), reloadOrg);
                      }} />
                    } />
                  ))}
                </FormGroup>
              </Section>
            )}

            {canEdit && (
              <Section title="Asks">
                <Stack spacing={1.5}>
                  {v.status !== 'active' && <Box><Button variant="outlined" onClick={() => run(() => api(path(`/volunteers/${v.id}`), { method: 'PATCH', body: { status: 'active' } }))}>Resume asks</Button></Box>}
                  {v.status === 'active' && (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
                      <TextField type="date" label="Pause until" value={pauseUntil} onChange={(e) => setPauseUntil(e.target.value)} />
                      <Button variant="outlined" disabled={!pauseUntil} onClick={() => run(() => api(path(`/volunteers/${v.id}`), { method: 'PATCH', body: { status: 'paused', pausedUntil: `${pauseUntil}T00:00` } }))}>Pause asks</Button>
                    </Stack>
                  )}
                  {v.status !== 'stopped' && <Box><Button color="error" onClick={stopAsks}>Stop asks</Button></Box>}
                </Stack>
              </Section>
            )}

            <Section title="History">
              {data.asks.length === 0 ? <Typography variant="body2" color="text.secondary">Never asked</Typography> : (
                <List disablePadding>
                  {data.asks.map((a: any) => (
                    <ListItem key={a.id} disableGutters>
                      <ListItemText primary={a.title} secondary={`${ANSWER[a.status]} · asked ${ago(a.created_at, Date.now())}`} />
                    </ListItem>
                  ))}
                </List>
              )}
              {data.spots.filter((s: any) => s.status === 'done').length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Done: {data.spots.filter((s: any) => s.status === 'done').map((s: any) => `${s.task.title} (${when(s.task)})`).join('; ')}
                </Typography>
              )}
            </Section>

            {me.role === 'admin' && <Box><Button color="error" onClick={deletePerson}>Delete person</Button></Box>}
          </Stack>
        </Box>
      </Stack>
    </Page>
  );
}
