import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Chip, FormControl, FormControlLabel, IconButton, InputLabel, Link, List, ListItem,
  ListItemText, MenuItem, Select, Stack, Switch, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Page, errorText, useLoad } from './common';
import type { FieldType } from '../../shared/types';

const TYPE_TEXT: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  one: 'One choice',
  many: 'Many choices',
  yesno: 'Yes or no',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h2" component="h2" sx={{ mb: 2 }}>{title}</Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    }
  };
  return { error, run };
}

function OrgSection() {
  const { org, path, reload, me } = useOrg();
  const [form, setForm] = useState({ name: org.name, weeklyAskLimit: org.weeklyAskLimit, signupUrl: org.signupUrl ?? '', publishDefault: org.publishDefault });
  const { error, run } = useAction();
  const [saved, setSaved] = useState(false);
  const admin = me.role === 'admin';
  return (
    <Section title="Organization">
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {saved && <Alert severity="success">Saved.</Alert>}
        <TextField label="Name" value={form.name} disabled={!admin} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField label="Asks one person can get in 7 days" type="number" disabled={!admin} value={form.weeklyAskLimit}
          onChange={(e) => setForm({ ...form, weeklyAskLimit: Number(e.target.value) })} slotProps={{ htmlInput: { min: 1, max: 14 } }} />
        <TextField label="Your sign-up page" placeholder="https://" disabled={!admin} value={form.signupUrl} onChange={(e) => setForm({ ...form, signupUrl: e.target.value })}
          helperText="Shown on public task pages for people who aren't volunteers yet. This tool doesn't do sign-ups." />
        <FormControlLabel control={<Switch disabled={!admin} checked={form.publishDefault} onChange={(e) => setForm({ ...form, publishDefault: e.target.checked })} />} label="Post new tasks publicly by default" />
        {admin && <Box><Button variant="contained" onClick={async () => { if (await run(() => api(path(''), { method: 'PATCH', body: form }))) { setSaved(true); reload(); } }}>Save</Button></Box>}
      </Stack>
    </Section>
  );
}

function FieldsSection() {
  const { fields, path, reload, me } = useOrg();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('one');
  const { error, run } = useAction();
  const canEdit = me.role !== 'lead';
  return (
    <Section title="Details you track">
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Skills, age, experience, languages: whatever your organization uses to decide who can do what. Tasks can require any of them.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack spacing={2}>
        {fields.map((f) => (
          <Box key={f.id}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h3" sx={{ flex: 1 }}>{f.label}</Typography>
              <Typography color="text.secondary">{TYPE_TEXT[f.type]}</Typography>
              {canEdit && <IconButton aria-label={`Delete ${f.label}`} onClick={() => confirm(`Delete ${f.label}? Values people have for it stay in the export only.`) && run(() => api(path(`/fields/${f.id}`), { method: 'DELETE' })).then(reload)}><DeleteIcon /></IconButton>}
            </Stack>
            {(f.type === 'one' || f.type === 'many') && (
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
                {f.options.map((o) => (
                  <Chip key={o} label={o} onDelete={canEdit ? () => run(() => api(path(`/fields/${f.id}`), { method: 'PATCH', body: { options: f.options.filter((x) => x !== o) } })).then(reload) : undefined} />
                ))}
                {canEdit && (
                  <TextField size="small" sx={{ width: 180 }} label="Add an option" onKeyDown={async (e) => {
                    const input = e.target as HTMLInputElement;
                    if (e.key === 'Enter' && input.value.trim()) {
                      e.preventDefault();
                      await run(() => api(path(`/fields/${f.id}`), { method: 'PATCH', body: { options: [...f.options, input.value.trim()] } }));
                      input.value = '';
                      reload();
                    }
                  }} />
                )}
              </Stack>
            )}
            {f.type === 'one' && f.options.length > 1 && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Listed from lowest to highest, so a task can ask for "{f.options[1]} or more".</Typography>}
          </Box>
        ))}
        {canEdit && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField size="small" label="New detail" value={label} onChange={(e) => setLabel(e.target.value)} />
            <FormControl size="small" fullWidth>
              <InputLabel id="new-type">Type</InputLabel>
              <Select labelId="new-type" label="Type" value={type} onChange={(e) => setType(e.target.value as FieldType)}>
                {Object.entries(TYPE_TEXT).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" disabled={!label.trim()} onClick={async () => { if (await run(() => api(path('/fields'), { body: { label, type } }))) { setLabel(''); reload(); } }}>Add</Button>
          </Stack>
        )}
      </Stack>
    </Section>
  );
}

function TeamsSection({ members }: { members: { id: string; email: string; role: string }[] }) {
  const { teams, path, reload, me } = useOrg();
  const [name, setName] = useState('');
  const { error, run } = useAction();
  const canEdit = me.role !== 'lead';
  return (
    <Section title="Teams">
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Groups inside your organization, like a sound crew. A team's leads decide who is on it, and tasks can require being on a team.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <List disablePadding>
        {teams.map((t) => (
          <ListItem key={t.id} disableGutters secondaryAction={canEdit && <IconButton aria-label={`Delete ${t.name}`} onClick={() => confirm(`Delete the ${t.name} team?`) && run(() => api(path(`/teams/${t.id}`), { method: 'DELETE' })).then(reload)}><DeleteIcon /></IconButton>}>
            <ListItemText
              primary={`${t.name} · ${t.volunteerIds.length} ${t.volunteerIds.length === 1 ? 'person' : 'people'}`}
              secondary={
                <Stack direction="row" spacing={1} useFlexGap component="span" sx={{ flexWrap: 'wrap', mt: 0.5 }}>
                  {t.leadMemberIds.map((id) => {
                    const m = members.find((x) => x.id === id);
                    return <Chip component="span" key={id} size="small" label={`Lead: ${m?.email ?? 'member'}`} onDelete={me.role === 'admin' ? () => run(() => api(path(`/teams/${t.id}/leads/${id}`), { method: 'DELETE' })).then(reload) : undefined} />;
                  })}
                  {me.role === 'admin' && members.filter((m) => !t.leadMemberIds.includes(m.id)).length > 0 && (
                    <Select size="small" displayEmpty value="" onChange={(e) => run(() => api(path(`/teams/${t.id}/leads`), { body: { memberId: e.target.value } })).then(reload)} sx={{ minWidth: 140 }}>
                      <MenuItem value="" disabled>Add a lead</MenuItem>
                      {members.filter((m) => !t.leadMemberIds.includes(m.id)).map((m) => <MenuItem key={m.id} value={m.id}>{m.email}</MenuItem>)}
                    </Select>
                  )}
                </Stack>
              }
              slotProps={{ secondary: { component: 'div' } }}
            />
          </ListItem>
        ))}
      </List>
      {canEdit && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField size="small" label="New team" value={name} onChange={(e) => setName(e.target.value)} />
          <Button variant="outlined" disabled={!name.trim()} onClick={async () => { if (await run(() => api(path('/teams'), { body: { name } }))) { setName(''); reload(); } }}>Add</Button>
        </Stack>
      )}
      <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>Add people to a team from their page under People.</Typography>
    </Section>
  );
}

function MembersSection({ members, reloadMembers }: { members: { id: string; email: string; role: string }[]; reloadMembers: () => void }) {
  const { path, me } = useOrg();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('coordinator');
  const { error, run } = useAction();
  const admin = me.role === 'admin';
  const ROLE: Record<string, string> = { admin: 'Admin', coordinator: 'Coordinator', lead: 'Team lead' };
  return (
    <Section title="People who run things">
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Every organization should have at least two admins. Coordinators manage people and tasks. Team leads manage their own team and its tasks.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <List disablePadding>
        {members.map((m) => (
          <ListItem key={m.id} disableGutters secondaryAction={admin && m.id !== me.memberId && <IconButton aria-label={`Remove ${m.email}`} onClick={() => run(() => api(path(`/members/${m.id}`), { method: 'DELETE' })).then(reloadMembers)}><DeleteIcon /></IconButton>}>
            <ListItemText primary={m.email} secondary={ROLE[m.role]} />
          </ListItem>
        ))}
      </List>
      {admin && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
          <TextField size="small" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select size="small" value={role} onChange={(e) => setRole(e.target.value)}>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="coordinator">Coordinator</MenuItem>
            <MenuItem value="lead">Team lead</MenuItem>
          </Select>
          <Button variant="outlined" disabled={!email.includes('@')} onClick={async () => { if (await run(() => api(path('/members'), { body: { email, role } }))) { setEmail(''); reloadMembers(); } }}>Add</Button>
        </Stack>
      )}
      {admin && members.filter((m) => m.role === 'admin').length < 2 && <Alert severity="info" sx={{ mt: 2 }}>Add a second admin, so the organization isn't stuck if you step away.</Alert>}
    </Section>
  );
}

function AtprotoSection() {
  const { org, path, reload, me, atprotoReady } = useOrg();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { error, run } = useAction();
  if (me.role !== 'admin') return null;
  return (
    <Section title="AT Protocol">
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Tasks you post go in your organization's own AT Protocol account, such as its Bluesky account. Only tasks are posted: never names, contact details or who said yes.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!atprotoReady && <Alert severity="info" sx={{ mb: 2 }}>Posting is not set up on this server yet.</Alert>}
      {org.atproto ? (
        <Stack spacing={1}>
          <Typography>Connected as <strong>{org.atproto.handle}</strong></Typography>
          <Box><Button color="error" onClick={() => confirm('Disconnect? Posted tasks are taken down first.') && run(() => api(path('/atproto'), { method: 'DELETE' })).then(reload)}>Disconnect</Button></Box>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <TextField label="Account handle" placeholder="yourgroup.bsky.social" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          <TextField label="App password" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)}
            helperText={<>Make one in Bluesky under Settings, Privacy and security, App passwords. Don't use your main password. <Link href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener">Open app passwords</Link></>} />
          <Box><Button variant="contained" disabled={!atprotoReady || !identifier || !password} onClick={async () => { if (await run(() => api(path('/atproto'), { body: { identifier, appPassword: password } }))) { setPassword(''); reload(); } }}>Connect</Button></Box>
        </Stack>
      )}
    </Section>
  );
}

export function Settings() {
  const { path, me } = useOrg();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, reload } = useLoad(() => api(path('/members')), [path]);
  const members = data?.members ?? [];
  return (
    <Page title="Settings">
      <Stack spacing={2}>
        {params.has('welcome') && (
          <Alert severity="success">
            Your organization is ready. Next: check the details you track below, then import your volunteer list.
          </Alert>
        )}
        {me.role !== 'lead' && (
          <Section title="Bring in your volunteers">
            <Typography color="text.secondary" sx={{ mb: 2 }}>Import a CSV, Excel, XML, JSON, text, Word or PDF file. You check how the columns match before anything is saved.</Typography>
            <Button variant="contained" onClick={() => navigate('../import', { relative: 'path' })}>Import a file</Button>
          </Section>
        )}
        <OrgSection />
        <FieldsSection />
        <TeamsSection members={members} />
        <MembersSection members={members} reloadMembers={reload} />
        <AtprotoSection />
        {me.role === 'admin' && (
          <Section title="Export">
            <Typography color="text.secondary" sx={{ mb: 2 }}>Everything your organization has here. The JSON file keeps stable IDs, so another tool can import it.</Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {['volunteers', 'tasks', 'asks', 'spots'].map((k) => <Button key={k} variant="outlined" href={path(`/export/${k}.csv`)}>{k[0].toUpperCase() + k.slice(1)} CSV</Button>)}
              <Button variant="outlined" href={path('/export.json')}>Everything as JSON</Button>
            </Stack>
          </Section>
        )}
        <Box>
          <Button onClick={async () => { await api('/api/auth/logout', { body: {} }); location.href = '/login'; }}>Sign out</Button>
        </Box>
      </Stack>
    </Page>
  );
}
