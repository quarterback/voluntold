import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, FormControl, FormControlLabel, FormGroup, InputLabel, List, ListItem,
  ListItemText, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Loading, Page, errorText, useLoad } from './common';
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
        }} helperText="Type and press Enter" />
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

  return (
    <Page title={v.name}>
      <Stack spacing={2}>
        <Typography color="text.secondary">{v.standing}</Typography>
        {problem && <Alert severity="error">{problem}</Alert>}
        {saved && <Alert severity="success" onClose={() => setSaved(false)}>Saved.</Alert>}

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <TextField label="Name" value={form.name} disabled={!canEdit} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField label="Email" value={form.email} disabled={!canEdit} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <TextField label="Phone" value={form.phone} disabled={!canEdit} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {fields.map((f) => (
                <FieldInput key={f.id} field={f} value={form.values[f.id]} onChange={(val) => setForm({ ...form, values: { ...form.values, [f.id]: val } })} />
              ))}
              {v.contactOkAt === null && canEdit && (
                <Button variant="outlined" onClick={() => run(() => api(path(`/volunteers/${v.id}`), { method: 'PATCH', body: { contactOk: true } }))}>They agreed to be contacted</Button>
              )}
              {canEdit && (
                <Box>
                  <Button variant="contained" onClick={() => run(() => api(path(`/volunteers/${v.id}`), { method: 'PATCH', body: form }), () => { setSaved(true); reloadOrg(); })}>Save</Button>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        {myTeams.length > 0 && (
          <Box>
            <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Teams</Typography>
            <FormGroup>
              {myTeams.map((t) => (
                <FormControlLabel key={t.id} label={t.name} control={
                  <Checkbox checked={teamIds.includes(t.id)} onChange={(e) => {
                    const on = e.target.checked;
                    setTeamIds(on ? [...teamIds, t.id] : teamIds.filter((x) => x !== t.id));
                    run(() => on
                      ? api(path(`/teams/${t.id}/members`), { body: { volunteerId: v.id } })
                      : api(path(`/teams/${t.id}/members/${v.id}`), { method: 'DELETE' }), reloadOrg);
                  }} />
                } />
              ))}
            </FormGroup>
          </Box>
        )}

        {canEdit && (
          <Box>
            <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Asking</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
              {v.status !== 'active' && <Button variant="outlined" onClick={() => run(() => api(path(`/volunteers/${v.id}`), { method: 'PATCH', body: { status: 'active' } }))}>Ask them again</Button>}
              {v.status === 'active' && (
                <>
                  <TextField size="small" type="date" label="Pause until" value={pauseUntil} onChange={(e) => setPauseUntil(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 200 }} />
                  <Button disabled={!pauseUntil} onClick={() => run(() => api(path(`/volunteers/${v.id}`), { method: 'PATCH', body: { status: 'paused', pausedUntil: `${pauseUntil}T00:00` } }))}>Pause</Button>
                </>
              )}
              {v.status !== 'stopped' && <Button color="error" onClick={() => confirm(`Stop asking ${v.name}?`) && run(() => api(path(`/volunteers/${v.id}`), { method: 'PATCH', body: { status: 'stopped' } }))}>Stop asking</Button>}
            </Stack>
          </Box>
        )}

        <Box>
          <Typography variant="h2" component="h2" sx={{ mb: 1 }}>History</Typography>
          {data.asks.length === 0 ? <Typography color="text.secondary">Never asked.</Typography> : (
            <List dense disablePadding>
              {data.asks.map((a: any) => (
                <ListItem key={a.id} disableGutters>
                  <ListItemText primary={a.title} secondary={`Asked ${ago(a.created_at, Date.now())}: ${({ waiting: 'no answer yet', yes: 'said yes', no: 'said no', expired: "didn't answer", closed: 'filled before they answered' } as Record<string, string>)[a.status]}`} />
                </ListItem>
              ))}
            </List>
          )}
          {data.spots.filter((s: any) => s.status === 'done').length > 0 && (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Done: {data.spots.filter((s: any) => s.status === 'done').map((s: any) => `${s.task.title} (${when(s.task)})`).join('; ')}
            </Typography>
          )}
        </Box>

        {me.role === 'admin' && (
          <Box>
            <Button color="error" onClick={() => confirm(`Delete ${v.name} and their history? This can't be undone.`) && run(() => api(path(`/volunteers/${v.id}`), { method: 'DELETE' }), () => navigate('..', { relative: 'path' }))}>Delete this person</Button>
          </Box>
        )}
      </Stack>
    </Page>
  );
}
