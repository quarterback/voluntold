import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormControlLabel, InputAdornment, InputLabel,
  ListItemButton, MenuItem, Select, Stack, Checkbox, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/PersonAddAlt';
import SearchIcon from '@mui/icons-material/Search';
import FilterIcon from '@mui/icons-material/FilterList';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { EmptyState, Loading, Page, StatusBadge, errorText, useDialogs, useLoad, type Tone } from './common';
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

/** A short status for the badge column. The full sentence sits under it. */
function badge(v: Row): [string, Tone] {
  if (v.status === 'stopped') return ['Stopped', 'danger'];
  if (v.status === 'paused') return ['Paused', 'warning'];
  if (v.lastAskedAt === null) return ['Ready', 'info'];
  return ['Active', 'success'];
}

const COLUMNS = { xs: '1fr auto', md: 'minmax(0, 1.5fr) minmax(0, 1.6fr) minmax(0, 1.4fr) 112px' };

export function People() {
  const { path, fields, teams, me } = useOrg();
  const navigate = useNavigate();
  const dialogs = useDialogs();
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
  const shownFields = fields.filter((f) => f.type === 'many' || f.type === 'one').slice(0, 2);
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  async function saveList() {
    const name = await dialogs.prompt({ title: 'Save list', label: 'List name', confirm: 'Save list' });
    if (!name) return;
    await api(path('/lists'), { body: { name, filter } });
    reload();
  }

  const addButton = canEdit && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAdding(true)}>Add person</Button>;

  return (
    <Page title="People" action={addButton}>
      {data.volunteers.length === 0 ? (
        <EmptyState title="No volunteers yet"
          action={<Button variant="contained" onClick={() => navigate('../import', { relative: 'path' })}>Import file</Button>} />
      ) : (
        <>
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1}>
              <TextField placeholder="Search" value={filter.q ?? ''} onChange={(e) => setFilter({ ...filter, q: e.target.value })}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }, htmlInput: { 'aria-label': 'Search' } }} />
              <Button variant="outlined" startIcon={<FilterIcon fontSize="small" />} onClick={() => setShowFilters(!showFilters)}>{showFilters ? 'Hide filters' : 'Show filters'}</Button>
            </Stack>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              {[['', 'All'], ['never', 'Never asked'], ['paused', 'Paused'], ['stopped', 'Stopped']].map(([k, label]) => (
                <Chip key={k} label={label} color={filter.status === k ? 'primary' : 'default'} onClick={() => setFilter({ ...filter, status: k as Filter['status'] })} />
              ))}
              {data.lists.map((l) => (
                <Chip key={l.id} label={l.name} variant="outlined" onClick={() => setFilter(l.filter)} onDelete={() => api(path(`/lists/${l.id}`), { method: 'DELETE' }).then(reload)} />
              ))}
              <Button size="small" onClick={saveList}>Save list</Button>
            </Stack>
            {(showFilters || filter.teamId || filter.fieldId) && (
              <Stack direction="row" spacing={1}>
                {teams.length > 0 && (
                  <FormControl fullWidth>
                    <InputLabel id="team-filter">Team</InputLabel>
                    <Select labelId="team-filter" label="Team" value={filter.teamId ?? ''} displayEmpty onChange={(e) => setFilter({ ...filter, teamId: e.target.value })}>
                      <MenuItem value="">Any team</MenuItem>
                      {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
                <FormControl fullWidth>
                  <InputLabel id="field-filter">Detail</InputLabel>
                  <Select labelId="field-filter" label="Detail" value={filter.fieldId ?? ''} displayEmpty onChange={(e) => setFilter({ ...filter, fieldId: e.target.value, value: '' })}>
                    <MenuItem value="">Any detail</MenuItem>
                    {fields.map((f) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
                  </Select>
                </FormControl>
                {field && (field.type === 'one' || field.type === 'many' ? (
                  <FormControl fullWidth>
                    <InputLabel id="value-filter">Value</InputLabel>
                    <Select labelId="value-filter" label="Value" value={filter.value ?? ''} onChange={(e) => setFilter({ ...filter, value: e.target.value })}>
                      {field.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </Select>
                  </FormControl>
                ) : field.type === 'yesno' ? (
                  <FormControlLabel sx={{ mt: 3 }} control={<Checkbox size="small" checked={!!filter.value} onChange={(e) => setFilter({ ...filter, value: e.target.checked ? 'yes' : '' })} />} label="Is yes" />
                ) : (
                  <TextField label="Value" value={filter.value ?? ''} onChange={(e) => setFilter({ ...filter, value: e.target.value })} />
                ))}
              </Stack>
            )}
          </Stack>

          <Card>
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: COLUMNS.md, gap: 2, px: 2.5, py: 1, bgcolor: (t) => t.vt.subtle }}>
              {['Name', 'Last asked', shownFields.map((f) => f.label).join(' and ') || 'Details', 'Status'].map((h) => (
                <Typography key={h} variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>{h}</Typography>
              ))}
            </Box>
            {shown.length === 0 && <Typography color="text.secondary" sx={{ p: 2.5 }}>No results</Typography>}
            {shown.map((v, i) => {
              const details = shownFields.flatMap((f) => [v.values[f.id]].flat()).filter(Boolean).join(', ');
              const [label, tone] = badge(v);
              return (
                <Box key={v.id}>
                  <Divider sx={{ display: i === 0 ? { xs: 'none', md: 'block' } : 'block' }} />
                  <ListItemButton onClick={() => navigate(v.id)} sx={{ borderRadius: 0, px: 2.5, py: 1.25, display: 'grid', gridTemplateColumns: COLUMNS, gap: { xs: 0.5, md: 2 }, alignItems: 'center' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h3" noWrap>{v.name}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>{[v.email ?? v.phone, ...v.teamIds.map((id) => teamName.get(id))].filter(Boolean).join(' · ')}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ gridRow: { xs: 2, md: 'auto' }, gridColumn: { xs: '1 / -1', md: 'auto' } }}>
                      {v.standing}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ display: { xs: 'none', md: 'block' } }}>{details}</Typography>
                    <Box sx={{ gridRow: { xs: 1, md: 'auto' }, gridColumn: { xs: 2, md: 'auto' } }}><StatusBadge label={label} tone={tone} /></Box>
                  </ListItemButton>
                </Box>
              );
            })}
          </Card>
        </>
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
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {error && <Typography color="error" variant="body2">{error}</Typography>}
          <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <FormControlLabel control={<Checkbox size="small" checked={form.contactOk} onChange={(e) => setForm({ ...form, contactOk: e.target.checked })} />} label="They agreed to be contacted" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => onClose()}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!form.name.trim()}>Add person</Button>
      </DialogActions>
    </Dialog>
  );
}
