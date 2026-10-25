import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Select, Stack, Switch,
  TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Loading, Page, Section, errorText } from './common';
import BackIcon from '@mui/icons-material/ArrowBack';
import { toLocalDate, toLocalInput } from '../format';
import type { Field, Requirement, RequirementOp } from '../../shared/types';

const OPS: Record<Field['type'], { op: RequirementOp; label: string }[]> = {
  text: [{ op: 'is', label: 'is' }, { op: 'includes', label: 'includes' }],
  number: [{ op: 'atLeast', label: 'at least' }, { op: 'atMost', label: 'at most' }, { op: 'is', label: 'is' }],
  date: [{ op: 'atLeast', label: 'on or after' }, { op: 'atMost', label: 'on or before' }],
  one: [{ op: 'is', label: 'is' }, { op: 'atLeast', label: 'at least' }, { op: 'atMost', label: 'at most' }],
  many: [{ op: 'includes', label: 'includes' }],
  yesno: [{ op: 'isYes', label: 'is Yes' }],
};

const ASK_MODES = {
  few: { label: 'In batches' },
  everyone: { label: 'All eligible' },
  hand: { label: 'Manual' },
};

interface Form {
  title: string;
  description: string;
  contact: string;
  timing: 'at_time' | 'by_date' | 'none';
  startsAt: string;
  endsAt: string;
  dueAt: string;
  placePublic: string;
  placePrivate: string;
  peopleNeeded: number;
  requirements: Requirement[];
  askMode: 'few' | 'everyone' | 'hand';
  askBatch: string;
  askWaitHours: number;
  teamId: string;
  publish: boolean;
}


export function TaskEdit() {
  const { taskId } = useParams();
  const { path, fields, teams, org, me } = useOrg();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('draft');
  const leadOnly = me.role === 'lead';

  useEffect(() => {
    if (!taskId) {
      setForm({
        title: '', description: '', contact: '', timing: 'at_time', startsAt: '', endsAt: '', dueAt: '', placePublic: '', placePrivate: '',
        peopleNeeded: 2, requirements: [], askMode: 'few', askBatch: '', askWaitHours: 24, teamId: leadOnly ? me.leadTeamIds[0] ?? '' : '',
        publish: Boolean(org.atproto) && org.publishDefault,
      });
      return;
    }
    api(path(`/tasks/${taskId}`)).then(({ task }) => {
      setStatus(task.status);
      setForm({
        ...task,
        startsAt: toLocalInput(task.startsAt),
        endsAt: toLocalInput(task.endsAt),
        dueAt: toLocalDate(task.dueAt),
        askBatch: task.askBatch ? String(task.askBatch) : '',
        teamId: task.teamId ?? '',
      });
    }, (e) => setError(errorText(e)));
  }, [taskId]);

  if (!form) return <Loading error={error} />;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v });

  function payload() {
    const ms = (s: string) => (s ? new Date(s).getTime() : null);
    return {
      ...form!,
      startsAt: ms(form!.startsAt),
      endsAt: ms(form!.endsAt),
      // A due date means the end of that day, where the coordinator is.
      dueAt: form!.dueAt ? new Date(`${form!.dueAt}T23:59`).getTime() : null,
      askBatch: form!.askBatch ? Number(form!.askBatch) : null,
      teamId: form!.teamId || null,
    };
  }

  async function save(open: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (taskId) {
        await api(path(`/tasks/${taskId}`), { method: 'PATCH', body: payload() });
        if (open && status === 'draft') await api(path(`/tasks/${taskId}/open`), { body: {} });
        navigate(`/o/${org.id}/tasks/${taskId}`);
      } else {
        const res = await api(path('/tasks'), { body: { ...payload(), open } });
        navigate(`/o/${org.id}/tasks/${res.id}`);
      }
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const reqTarget = (r: Requirement) => (r.kind === 'team' ? `team:${r.teamId}` : `field:${r.fieldId}`);
  function changeTarget(i: number, target: string) {
    const next = [...form!.requirements];
    if (target.startsWith('team:')) next[i] = { kind: 'team', teamId: target.slice(5) };
    else {
      const field = fields.find((f) => f.id === target.slice(6))!;
      next[i] = { kind: 'field', fieldId: field.id, op: OPS[field.type][0].op, value: field.type === 'one' || field.type === 'many' ? field.options[0] ?? '' : '' };
    }
    set('requirements', next);
  }
  function changeReq(i: number, patch: Partial<Requirement>) {
    const next = [...form!.requirements];
    next[i] = { ...next[i], ...patch } as Requirement;
    set('requirements', next);
  }

  const visibleTeams = teams.filter((t) => !leadOnly || me.leadTeamIds.includes(t.id));

  const label = (text: string) => <Typography component="p" sx={{ fontSize: '0.8125rem', fontWeight: 500, mb: 0.75 }}>{text}</Typography>;

  return (
    <Page
      title={taskId ? 'Edit task' : 'New task'}
      width={760}
      back={<Button size="small" startIcon={<BackIcon fontSize="small" />} onClick={() => navigate(-1)} sx={{ color: 'text.secondary', ml: -1 }}>Back</Button>}
    >
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <Section title="Details">
          <Stack spacing={2}>
            <TextField label="Title" required value={form.title} onChange={(e) => set('title', e.target.value)} />
            <TextField label="Description" multiline minRows={2}  value={form.description} onChange={(e) => set('description', e.target.value)} />
            <Box>
              {label('When')}
              <ToggleButtonGroup exclusive size="small" value={form.timing} onChange={(_, v) => v && set('timing', v)} aria-label="When">
                <ToggleButton value="at_time">Date and time</ToggleButton>
                <ToggleButton value="by_date">Due date</ToggleButton>
                <ToggleButton value="none">No date</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {form.timing === 'at_time' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Start" type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
                <TextField label="End" type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
              </Stack>
            )}
            {form.timing === 'by_date' && (
              <TextField label="Due date" type="date" value={form.dueAt} onChange={(e) => set('dueAt', e.target.value)} sx={{ maxWidth: 220 }} />
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Location" value={form.placePublic} onChange={(e) => set('placePublic', e.target.value)} />
              <TextField label="Address" value={form.placePrivate} onChange={(e) => set('placePrivate', e.target.value)} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Volunteers needed" type="number" value={form.peopleNeeded} onChange={(e) => set('peopleNeeded', Number(e.target.value))}
                slotProps={{ htmlInput: { min: 1, max: 500 } }} sx={{ width: 170, flexShrink: 0 }} />
              <TextField label="Contact" value={form.contact} onChange={(e) => set('contact', e.target.value)} />
            </Stack>
          </Stack>
        </Section>

        <Section title="Requirements">
          <Stack spacing={1.5}>
            {form.requirements.map((r, i) => {
              const field = r.kind === 'field' ? fields.find((f) => f.id === r.fieldId) : undefined;
              return (
                <Box key={i} sx={{
                  display: 'grid', gap: 1, alignItems: 'end',
                  // On a phone the detail gets its own line, with the rule and value under it.
                  gridTemplateColumns: { xs: '1fr 1fr auto', sm: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 2fr) auto' },
                  '& > .req-detail': { gridColumn: { xs: '1 / 3', sm: 'auto' } },
                  '& > .req-remove': { gridColumn: { xs: 3, sm: 4 }, gridRow: { xs: 1, sm: 'auto' } },
                }}>
                  <FormControl fullWidth className="req-detail">
                    <InputLabel id={`req-${i}`}>Field</InputLabel>
                    <Select labelId={`req-${i}`} label="Field" value={reqTarget(r)} onChange={(e) => changeTarget(i, e.target.value)}>
                      {fields.map((f) => <MenuItem key={f.id} value={`field:${f.id}`}>{f.label}</MenuItem>)}
                      {teams.map((t) => <MenuItem key={t.id} value={`team:${t.id}`}>Team: {t.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {r.kind === 'field' && field && (
                    <>
                      {OPS[field.type].length > 1 && (
                        <FormControl fullWidth>
                          <InputLabel id={`op-${i}`}>Condition</InputLabel>
                          <Select labelId={`op-${i}`} label="Condition" value={r.op} onChange={(e) => changeReq(i, { op: e.target.value as RequirementOp })}>
                            {OPS[field.type].map((o) => <MenuItem key={o.op} value={o.op}>{o.label}</MenuItem>)}
                          </Select>
                        </FormControl>
                      )}
                      {r.op !== 'isYes' &&
                        (field.type === 'one' || field.type === 'many' ? (
                          <FormControl fullWidth>
                            <InputLabel id={`val-${i}`}>Value</InputLabel>
                            <Select labelId={`val-${i}`} label="Value" value={String(r.value ?? '')} onChange={(e) => changeReq(i, { value: e.target.value })}>
                              {field.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                            </Select>
                          </FormControl>
                        ) : (
                          <TextField label="Value" type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={r.value ?? ''}
                            onChange={(e) => changeReq(i, { value: field.type === 'number' ? Number(e.target.value) : e.target.value })} />
                        ))}
                    </>
                  )}
                  <IconButton className="req-remove" aria-label="Remove requirement" onClick={() => set('requirements', form.requirements.filter((_, j) => j !== i))} sx={{ mb: 0.25 }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              );
            })}
            <Box>
              <Button variant="outlined" size="small" startIcon={<AddIcon />} disabled={fields.length === 0 && teams.length === 0} onClick={() => {
                const f = fields[0];
                set('requirements', [...form.requirements, f ? { kind: 'field', fieldId: f.id, op: OPS[f.type][0].op, value: f.options[0] ?? '' } : { kind: 'team', teamId: teams[0].id }]);
              }}>Add requirement</Button>
            </Box>
          </Stack>
        </Section>

        <Section title="Asks">
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="ask-mode">Method</InputLabel>
                <Select labelId="ask-mode" label="Method" value={form.askMode} onChange={(e) => set('askMode', e.target.value as Form['askMode'])}>
                  {Object.entries(ASK_MODES).map(([k, m]) => <MenuItem key={k} value={k}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
              {(visibleTeams.length > 0 || leadOnly) && (
                <FormControl fullWidth>
                  <InputLabel id="team">Team</InputLabel>
                  <Select labelId="team" label="Team" value={form.teamId} displayEmpty onChange={(e) => set('teamId', e.target.value)}>
                    {!leadOnly && <MenuItem value="">No team</MenuItem>}
                    {visibleTeams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
            </Stack>
            {form.askMode === 'few' && (
              <Stack direction="row" spacing={2}>
                <TextField label="Batch size" type="number" value={form.askBatch} placeholder={String(form.peopleNeeded * 2)} onChange={(e) => set('askBatch', e.target.value)} />
                <TextField label="Hours between batches" type="number" value={form.askWaitHours} onChange={(e) => set('askWaitHours', Number(e.target.value))} />
              </Stack>
            )}
            <FormControlLabel
              disabled={!org.atproto}
              control={<Switch checked={form.publish && !!org.atproto} onChange={(e) => set('publish', e.target.checked)} />}
              label={org.atproto ? `Post to ${org.atproto.handle}` : 'Post on AT Protocol'}
            />
          </Stack>
        </Section>

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
          {status === 'draft' && <Button variant="outlined" disabled={busy} onClick={() => save(false)}>Save draft</Button>}
          <Button variant="contained" disabled={busy} onClick={() => save(true)}>{status === 'draft' ? 'Publish' : 'Save'}</Button>
        </Stack>
      </Stack>
    </Page>
  );
}
