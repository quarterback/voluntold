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
import { Loading, Page, errorText } from './common';
import { toLocalDate, toLocalInput } from '../format';
import type { Field, Requirement, RequirementOp } from '../../shared/types';

const OPS: Record<Field['type'], { op: RequirementOp; label: string }[]> = {
  text: [{ op: 'is', label: 'is' }, { op: 'includes', label: 'includes' }],
  number: [{ op: 'atLeast', label: 'is at least' }, { op: 'atMost', label: 'is at most' }, { op: 'is', label: 'is' }],
  date: [{ op: 'atLeast', label: 'is on or after' }, { op: 'atMost', label: 'is on or before' }],
  one: [{ op: 'is', label: 'is' }, { op: 'atLeast', label: 'is at least' }, { op: 'atMost', label: 'is at most' }],
  many: [{ op: 'includes', label: 'includes' }],
  yesno: [{ op: 'isYes', label: 'is yes' }],
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
  const { path, fields, teams, org, me, atprotoReady } = useOrg();
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

  return (
    <Page title={taskId ? 'Change task' : 'New task'}>
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Title" required value={form.title} onChange={(e) => set('title', e.target.value)} helperText="Say what the work is, for example: Registration desk" />
        <TextField label="What to do" multiline minRows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />

        <Box>
          <Typography variant="h3" component="h2" gutterBottom>When</Typography>
          <ToggleButtonGroup exclusive value={form.timing} onChange={(_, v) => v && set('timing', v)} size="small" sx={{ mb: 2, flexWrap: 'wrap' }}>
            <ToggleButton value="at_time">At a set time</ToggleButton>
            <ToggleButton value="by_date">By a date</ToggleButton>
            <ToggleButton value="none">No date</ToggleButton>
          </ToggleButtonGroup>
          {form.timing === 'at_time' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Starts" type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="Ends" type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
          )}
          {form.timing === 'by_date' && (
            <TextField label="Due by" type="date" value={form.dueAt} onChange={(e) => set('dueAt', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          )}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Place, public part" value={form.placePublic} onChange={(e) => set('placePublic', e.target.value)} helperText="Shown if the task is posted, for example: East Side branch" />
          <TextField label="Place, private part" value={form.placePrivate} onChange={(e) => set('placePrivate', e.target.value)} helperText="Only people you ask see this, for example the street address" />
        </Stack>
        <TextField label="Who to find when they arrive" value={form.contact} onChange={(e) => set('contact', e.target.value)} />
        <TextField label="How many people" type="number" value={form.peopleNeeded} onChange={(e) => set('peopleNeeded', Number(e.target.value))} slotProps={{ htmlInput: { min: 1, max: 500 } }} />

        <Box>
          <Typography variant="h3" component="h2">What it needs</Typography>
          <Typography color="text.secondary" sx={{ mb: 1.5 }}>Only people who meet every requirement are asked.</Typography>
          <Stack spacing={1.5}>
            {form.requirements.map((r, i) => {
              const field = r.kind === 'field' ? fields.find((f) => f.id === r.fieldId) : undefined;
              return (
                <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id={`req-${i}`}>Detail</InputLabel>
                    <Select labelId={`req-${i}`} label="Detail" value={reqTarget(r)} onChange={(e) => changeTarget(i, e.target.value)}>
                      {fields.map((f) => <MenuItem key={f.id} value={`field:${f.id}`}>{f.label}</MenuItem>)}
                      {teams.map((t) => <MenuItem key={t.id} value={`team:${t.id}`}>On the {t.name} team</MenuItem>)}
                    </Select>
                  </FormControl>
                  {r.kind === 'field' && field && (
                    <>
                      <FormControl fullWidth size="small">
                        <InputLabel id={`op-${i}`}>Rule</InputLabel>
                        <Select labelId={`op-${i}`} label="Rule" value={r.op} onChange={(e) => changeReq(i, { op: e.target.value as RequirementOp })}>
                          {OPS[field.type].map((o) => <MenuItem key={o.op} value={o.op}>{o.label}</MenuItem>)}
                        </Select>
                      </FormControl>
                      {r.op !== 'isYes' &&
                        (field.type === 'one' || field.type === 'many' ? (
                          <FormControl fullWidth size="small">
                            <InputLabel id={`val-${i}`}>Value</InputLabel>
                            <Select labelId={`val-${i}`} label="Value" value={String(r.value ?? '')} onChange={(e) => changeReq(i, { value: e.target.value })}>
                              {field.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                            </Select>
                          </FormControl>
                        ) : (
                          <TextField size="small" label="Value" type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={r.value ?? ''}
                            onChange={(e) => changeReq(i, { value: field.type === 'number' ? Number(e.target.value) : e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                        ))}
                    </>
                  )}
                  <IconButton aria-label="Remove requirement" onClick={() => set('requirements', form.requirements.filter((_, j) => j !== i))}><DeleteIcon /></IconButton>
                </Stack>
              );
            })}
            <Box>
              <Button startIcon={<AddIcon />} disabled={fields.length === 0 && teams.length === 0} onClick={() => {
                const f = fields[0];
                set('requirements', [...form.requirements, f ? { kind: 'field', fieldId: f.id, op: OPS[f.type][0].op, value: f.options[0] ?? '' } : { kind: 'team', teamId: teams[0].id }]);
              }}>Add a requirement</Button>
            </Box>
          </Stack>
        </Box>

        {(teams.length > 0 || leadOnly) && (
          <FormControl fullWidth>
            <InputLabel id="team">Team that owns it</InputLabel>
            <Select labelId="team" label="Team that owns it" value={form.teamId} onChange={(e) => set('teamId', e.target.value)}>
              {!leadOnly && <MenuItem value="">No team</MenuItem>}
              {teams.filter((t) => !leadOnly || me.leadTeamIds.includes(t.id)).map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}

        <Box>
          <Typography variant="h3" component="h2" gutterBottom>How to ask people</Typography>
          <ToggleButtonGroup orientation="vertical" exclusive fullWidth value={form.askMode} onChange={(_, v) => v && set('askMode', v)}>
            <ToggleButton value="few" sx={{ justifyContent: 'flex-start', textAlign: 'left' }}>
              <Box><strong>A few at a time.</strong> Ask the people who fit and have waited longest. If it isn't full in time, Today says to ask the next group.</Box>
            </ToggleButton>
            <ToggleButton value="everyone" sx={{ justifyContent: 'flex-start', textAlign: 'left' }}>
              <Box><strong>Everyone who fits.</strong> Ask them all at once. The first to say yes get the spots.</Box>
            </ToggleButton>
            <ToggleButton value="hand" sx={{ justifyContent: 'flex-start', textAlign: 'left' }}>
              <Box><strong>Pick by hand.</strong> Choose people from the list of who fits.</Box>
            </ToggleButton>
          </ToggleButtonGroup>
          {form.askMode === 'few' && (
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <TextField label="People per group" type="number" value={form.askBatch} placeholder={String(form.peopleNeeded * 2)} onChange={(e) => set('askBatch', e.target.value)} helperText="Blank means twice the open spots" slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="Hours before the next group" type="number" value={form.askWaitHours} onChange={(e) => set('askWaitHours', Number(e.target.value))} />
            </Stack>
          )}
        </Box>

        <Box>
          <FormControlLabel
            control={<Switch checked={form.publish} onChange={(e) => set('publish', e.target.checked)} />}
            label="Post publicly on AT Protocol"
          />
          <Typography color="text.secondary">
            {org.atproto
              ? `Posts the task, not the people, to ${org.atproto.handle}. Anyone can see and follow it.`
              : atprotoReady
                ? 'Connect an AT Protocol account in Settings to post tasks. Until then, this stays private.'
                : 'Posting is not set up on this server yet. The task stays private.'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', pt: 1 }}>
          <Button onClick={() => navigate(-1)}>Cancel</Button>
          {status === 'draft' && <Button variant="outlined" disabled={busy} onClick={() => save(false)}>Save as draft</Button>}
          <Button variant="contained" disabled={busy} onClick={() => save(true)}>{status === 'draft' ? 'Save and open' : 'Save changes'}</Button>
        </Stack>
      </Stack>
    </Page>
  );
}
