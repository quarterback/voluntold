import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, InputLabel, List,
  ListItemButton, ListItemText, MenuItem, Select, Stack, Checkbox, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/PersonAddAlt';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Empty, Loading, Page, errorText, useLoad } from './common';
import { meetsRequirement, byLongestWait } from '../../shared/rules';
import type { Requirement, Volunteer } from '../../shared/types';

type Row = Volunteer & { standing: string };

interface Filter {
  q?: string;
  status?: 'never' | 'paused' | 'stopped' | '';
  teamId?: string;
  fieldId?: string;
  value?: string;
}

function matches(v: Row, f: Filter, fields: ReturnType<typeof useOrg>['fields']): boolean {
  if (f.q && !`${v.name} ${v.email ?? ''} ${v.phone ?? ''}`.toLowerCase().includes(f.q.toLowerCase())) return false;
  if (f.status === 'never' && v.lastAskedAt !== null) return false;
  if (f.status === 'paused' && v.status !== 'paused') return false;
  if (f.status === 'stopped' && v.status !== 'stopped') return false;
  if (f.teamId && !v.teamIds.includes(f.teamId)) return false;
  if (f.fieldId && f.value) {
    const field = fields.find((x) => x.id === f.fieldId);
    if (field) {
      const req: Requirement = { kind: 'field', fieldId: field.id, op: field.type === 'many' ? 'includes' : field.type === 'yesno' ? 'isYes' : 'is', value: f.value };
      if (!meetsRequirement(v, req, fields)) return false;
    }
  }
  return true;
}

export function People() {
  const { path, fields, teams, me } = useOrg();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, error, reload } = useLoad(async () => {
    const [v, l] = await Promise.all([api(path('/volunteers')), api(path('/lists'))]);
    return { volunteers: v.volunteers as Row[], lists: l.lists as { id: string; name: string; filter: Filter }[] };
  }, [path]);
  const [filter, setFilter] = useState<Filter>({ status: (params.get('filter') as Filter['status']) ?? '' });
  const [adding, setAdding] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const shown = useMemo(
    () => (data ? data.volunteers.filter((v) => matches(v, filter, fields)).sort(byLongestWait) : []),
    [data, filter, fields],
  );
  if (!data) return <Loading error={error} />;
  const field = fields.find((f) => f.id === filter.fieldId);
  const canEdit = me.role !== 'lead';

  async function saveList() {
    const name = prompt('Name this list');
    if (!name) return;
    await api(path('/lists'), { body: { name, filter } });
    reload();
  }

  return (
    <Page title="People" action={canEdit && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAdding(true)}>Add</Button>}>
      <Stack spacing={1} sx={{ mb: 1.5 }}>
        <TextField label="Search" value={filter.q ?? ''} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {[['', 'All'], ['never', 'Never asked'], ['paused', 'Paused'], ['stopped', 'Stopped']].map(([k, label]) => (
            <Chip key={k} size="small" label={label} color={filter.status === k ? 'primary' : 'default'} variant={filter.status === k ? 'filled' : 'outlined'} onClick={() => setFilter({ ...filter, status: k as Filter['status'] })} />
          ))}
          {data.lists.map((l) => (
            <Chip key={l.id} size="small" label={l.name} variant="outlined" onClick={() => setFilter(l.filter)} onDelete={() => api(path(`/lists/${l.id}`), { method: 'DELETE' }).then(reload)} />
          ))}
        </Stack>
        {(showFilters || filter.teamId || filter.fieldId) && <Stack direction="row" spacing={1}>
          {teams.length > 0 && (
            <FormControl size="small" fullWidth>
              <InputLabel id="team-filter">Team</InputLabel>
              <Select labelId="team-filter" label="Team" value={filter.teamId ?? ''} onChange={(e) => setFilter({ ...filter, teamId: e.target.value })}>
                <MenuItem value="">Any team</MenuItem>
                {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          <FormControl size="small" fullWidth>
            <InputLabel id="field-filter">Detail</InputLabel>
            <Select labelId="field-filter" label="Detail" value={filter.fieldId ?? ''} onChange={(e) => setFilter({ ...filter, fieldId: e.target.value, value: '' })}>
              <MenuItem value="">Any detail</MenuItem>
              {fields.map((f) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
            </Select>
          </FormControl>
          {field && (field.type === 'one' || field.type === 'many' ? (
            <FormControl size="small" fullWidth>
              <InputLabel id="value-filter">Is</InputLabel>
              <Select labelId="value-filter" label="Is" value={filter.value ?? ''} onChange={(e) => setFilter({ ...filter, value: e.target.value })}>
                {field.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </Select>
            </FormControl>
          ) : field.type === 'yesno' ? (
            <Button variant={filter.value ? 'contained' : 'outlined'} onClick={() => setFilter({ ...filter, value: filter.value ? '' : 'yes' })}>Is yes</Button>
          ) : (
            <TextField size="small" label="Is" value={filter.value ?? ''} onChange={(e) => setFilter({ ...filter, value: e.target.value })} />
          ))}
        </Stack>}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">{shown.length} of {data.volunteers.length} · longest wait first</Typography>
          <Box>
            <Button size="small" onClick={() => setShowFilters(!showFilters)}>Filters</Button>
            <Button size="small" onClick={saveList}>Save list</Button>
          </Box>
        </Stack>
      </Stack>

      {data.volunteers.length === 0 ? (
        <Empty>No people yet. Import a list in Settings.</Empty>
      ) : (
        <Card>
          <List disablePadding>
            {shown.map((v) => {
              const skills = fields.filter((f) => f.type === 'many' || f.type === 'one').slice(0, 2).map((f) => v.values[f.id]).flat().filter(Boolean).join(', ');
              return (
                <ListItemButton key={v.id} divider onClick={() => navigate(v.id)}>
                  <ListItemText primary={v.name} secondary={<><Box component="span" sx={{ display: 'block' }}>{v.standing}</Box>{skills && <Box component="span">{skills}</Box>}</>} />
                </ListItemButton>
              );
            })}
          </List>
        </Card>
      )}
      {adding && <AddPerson onClose={(id) => { setAdding(false); if (id) reload(); }} />}
    </Page>
  );
}

function AddPerson({ onClose }: { onClose: (id?: string) => void }) {
  const { path } = useOrg();
  const [form, setForm] = useState({ name: '', email: '', phone: '', contactOk: false });
  const [error, setError] = useState<string | null>(null);
  async function save() {
    try {
      const res = await api(path('/volunteers'), { body: form });
      onClose(res.id);
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <Dialog open fullWidth maxWidth="xs" onClose={() => onClose()}>
      <DialogTitle>Add person</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Typography color="error">{error}</Typography>}
          <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <FormControlLabel control={<Checkbox checked={form.contactOk} onChange={(e) => setForm({ ...form, contactOk: e.target.checked })} />} label="Agreed to be contacted" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!form.name.trim()}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}
