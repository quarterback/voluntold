import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, FormControl, FormControlLabel, IconButton, InputLabel, Link, List, ListItem,
  ListItemText, MenuItem, Select, Stack, Switch, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Page, Section, errorText, useDialogs, useLoad } from './common';
import type { FieldType } from '../../shared/types';

const TYPE_TEXT: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  one: 'One choice',
  many: 'Many choices',
  yesno: 'Yes or no',
};

const ROLE: Record<string, string> = { admin: 'Admin', coordinator: 'Coordinator', lead: 'Team lead' };

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

/** Adds an item from a text field when you press Enter. */
function AddOnEnter({ label, onAdd }: { label: string; onAdd: (value: string) => Promise<unknown> }) {
  return (
    <TextField label={label} sx={{ width: 160 }} onKeyDown={async (e) => {
      const input = e.target as HTMLInputElement;
      if (e.key === 'Enter' && input.value.trim()) {
        e.preventDefault();
        await onAdd(input.value.trim());
        input.value = '';
      }
    }} />
  );
}

function OrgSection() {
  const { org, path, reload, me } = useOrg();
  const [form, setForm] = useState({ name: org.name, weeklyAskLimit: org.weeklyAskLimit, signupUrl: org.signupUrl ?? '', publishDefault: org.publishDefault });
  const { error, run } = useAction();
  const [saved, setSaved] = useState(false);
  const admin = me.role === 'admin';
  return (
    <Section title="Organization">
      <Stack spacing={1.5}>
        {error && <Alert severity="error">{error}</Alert>}
        {saved && <Alert severity="success">Changes saved</Alert>}
        <Stack direction="row" spacing={1.5}>
          <TextField label="Name" value={form.name} disabled={!admin} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Asks per week" type="number" disabled={!admin} value={form.weeklyAskLimit} sx={{ width: 140, flexShrink: 0 }}
            onChange={(e) => setForm({ ...form, weeklyAskLimit: Number(e.target.value) })} slotProps={{ htmlInput: { min: 1, max: 14 } }} />
        </Stack>
        <TextField label="Sign-up link" placeholder="https://" disabled={!admin} value={form.signupUrl} onChange={(e) => setForm({ ...form, signupUrl: e.target.value })}
          helperText="For new people who find a public task" />
        <FormControlLabel control={<Switch size="small" disabled={!admin} checked={form.publishDefault} onChange={(e) => setForm({ ...form, publishDefault: e.target.checked })} />} label="Post new tasks on AT Protocol" />
        {admin && <Box><Button variant="contained" onClick={async () => { if (await run(() => api(path(''), { method: 'PATCH', body: form }))) { setSaved(true); reload(); } }}>Save changes</Button></Box>}
      </Stack>
    </Section>
  );
}

function FieldsSection() {
  const { fields, path, reload, me } = useOrg();
  const dialogs = useDialogs();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('one');
  const { error, run } = useAction();
  const canEdit = me.role !== 'lead';
  return (
    <Section title="Volunteer details" note="Tasks can require any of these. List choices from lowest to highest.">
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      <Stack spacing={1.5}>
        {fields.map((f) => (
          <Box key={f.id}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h3" sx={{ flex: 1 }}>{f.label}</Typography>
              <Typography variant="body2" color="text.secondary">{TYPE_TEXT[f.type]}</Typography>
              {canEdit && <IconButton size="small" aria-label={`Delete ${f.label}`} onClick={async () => (await dialogs.confirm({ title: `Delete ${f.label}?`, body: 'People lose this detail, and tasks stop requiring it.', confirm: 'Delete detail', destructive: true })) && run(() => api(path(`/fields/${f.id}`), { method: 'DELETE' })).then(reload)}><DeleteIcon fontSize="small" /></IconButton>}
            </Stack>
            {(f.type === 'one' || f.type === 'many') && (
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.5, alignItems: 'center' }}>
                {f.options.map((o) => (
                  <Chip key={o} size="small" label={o} onDelete={canEdit ? () => run(() => api(path(`/fields/${f.id}`), { method: 'PATCH', body: { options: f.options.filter((x) => x !== o) } })).then(reload) : undefined} />
                ))}
                {canEdit && <AddOnEnter label="Add choice" onAdd={(v) => run(() => api(path(`/fields/${f.id}`), { method: 'PATCH', body: { options: [...f.options, v] } })).then(reload)} />}
              </Stack>
            )}
          </Box>
        ))}
        {canEdit && (
          <Stack direction="row" spacing={1}>
            <TextField label="New detail" value={label} onChange={(e) => setLabel(e.target.value)} />
            <FormControl sx={{ minWidth: 140 }}>
              <InputLabel id="new-type">Type</InputLabel>
              <Select labelId="new-type" label="Type" value={type} onChange={(e) => setType(e.target.value as FieldType)}>
                {Object.entries(TYPE_TEXT).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" disabled={!label.trim()} onClick={async () => { if (await run(() => api(path('/fields'), { body: { label, type } }))) { setLabel(''); reload(); } }}>Add detail</Button>
          </Stack>
        )}
      </Stack>
    </Section>
  );
}

function TeamsSection({ members }: { members: { id: string; email: string; role: string }[] }) {
  const { teams, path, reload, me } = useOrg();
  const dialogs = useDialogs();
  const [name, setName] = useState('');
  const { error, run } = useAction();
  const canEdit = me.role !== 'lead';
  return (
    <Section title="Teams" note="A team's leads decide who's on it. Add people from their page.">
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      <List disablePadding>
        {teams.map((t) => (
          <ListItem key={t.id} disableGutters secondaryAction={canEdit && <IconButton size="small" aria-label={`Delete ${t.name}`} onClick={async () => (await dialogs.confirm({ title: `Delete the ${t.name} team?`, body: 'Tasks stop requiring this team.', confirm: 'Delete team', destructive: true })) && run(() => api(path(`/teams/${t.id}`), { method: 'DELETE' })).then(reload)}><DeleteIcon fontSize="small" /></IconButton>}>
            <ListItemText
              primary={`${t.name} · ${t.volunteerIds.length} ${t.volunteerIds.length === 1 ? 'person' : 'people'}`}
              secondary={
                <Stack direction="row" spacing={0.75} useFlexGap component="span" sx={{ flexWrap: 'wrap', mt: 0.5 }}>
                  {t.leadMemberIds.map((id) => {
                    const m = members.find((x) => x.id === id);
                    return <Chip component="span" key={id} size="small" label={`Lead: ${m?.email ?? 'member'}`} onDelete={me.role === 'admin' ? () => run(() => api(path(`/teams/${t.id}/leads/${id}`), { method: 'DELETE' })).then(reload) : undefined} />;
                  })}
                  {me.role === 'admin' && members.filter((m) => !t.leadMemberIds.includes(m.id)).length > 0 && (
                    <Select displayEmpty value="" onChange={(e) => run(() => api(path(`/teams/${t.id}/leads`), { body: { memberId: e.target.value } })).then(reload)} sx={{ minWidth: 120, height: 28 }}>
                      <MenuItem value="" disabled>Add lead</MenuItem>
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
          <TextField label="New team" value={name} onChange={(e) => setName(e.target.value)} />
          <Button variant="outlined" disabled={!name.trim()} onClick={async () => { if (await run(() => api(path('/teams'), { body: { name } }))) { setName(''); reload(); } }}>Add team</Button>
        </Stack>
      )}
    </Section>
  );
}

function MembersSection({ members, reloadMembers }: { members: { id: string; email: string; role: string }[]; reloadMembers: () => void }) {
  const { path, me } = useOrg();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('coordinator');
  const { error, run } = useAction();
  const admin = me.role === 'admin';
  return (
    <Section title="Members" note="Admins run everything. Coordinators run people and tasks. Team leads run their team.">
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      <List disablePadding>
        {members.map((m) => (
          <ListItem key={m.id} disableGutters secondaryAction={admin && m.id !== me.memberId && <IconButton size="small" aria-label={`Remove ${m.email}`} onClick={() => run(() => api(path(`/members/${m.id}`), { method: 'DELETE' })).then(reloadMembers)}><DeleteIcon fontSize="small" /></IconButton>}>
            <ListItemText primary={m.email} secondary={ROLE[m.role]} />
          </ListItem>
        ))}
      </List>
      {admin && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select value={role} onChange={(e) => setRole(e.target.value)} sx={{ minWidth: 130 }} inputProps={{ 'aria-label': 'Role' }}>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="coordinator">Coordinator</MenuItem>
            <MenuItem value="lead">Team lead</MenuItem>
          </Select>
          <Button variant="outlined" disabled={!email.includes('@')} onClick={async () => { if (await run(() => api(path('/members'), { body: { email, role } }))) { setEmail(''); reloadMembers(); } }}>Add member</Button>
        </Stack>
      )}
      {admin && members.filter((m) => m.role === 'admin').length < 2 && <Alert severity="info" sx={{ mt: 1.5 }}>Add a second admin so you're not the only one who can change settings</Alert>}
    </Section>
  );
}

function AtprotoSection() {
  const { org, path, reload, me, atprotoReady } = useOrg();
  const dialogs = useDialogs();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { error, run } = useAction();
  if (me.role !== 'admin') return null;
  return (
    <Section title="AT Protocol" note="Posts tasks to your account. Never names, contact details or answers.">
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {!atprotoReady && <Alert severity="info" sx={{ mb: 1.5 }}>Posting isn't set up on this server</Alert>}
      {org.atproto ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ flex: 1 }}>Connected as <strong>{org.atproto.handle}</strong></Typography>
          <Button color="error" onClick={async () => (await dialogs.confirm({ title: 'Disconnect this account?', body: 'Posted tasks are taken down first.', confirm: 'Disconnect account', destructive: true })) && run(() => api(path('/atproto'), { method: 'DELETE' })).then(reload)}>Disconnect account</Button>
        </Stack>
      ) : (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5}>
            <TextField label="Handle" placeholder="yourgroup.bsky.social" value={identifier} onChange={(e) => setIdentifier(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="App password" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Not your main password. <Link href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener">Make an app password in Bluesky</Link>.
          </Typography>
          <Box><Button variant="contained" disabled={!atprotoReady || !identifier || !password} onClick={async () => { if (await run(() => api(path('/atproto'), { body: { identifier, appPassword: password } }))) { setPassword(''); reload(); } }}>Connect account</Button></Box>
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
    <Page title="Settings" width={760}>
      <Stack spacing={2}>
        {params.has('welcome') && <Alert severity="success">Your organization is ready. Check the volunteer details below, then import your list.</Alert>}
        {me.role !== 'lead' && (
          <Section title="Import volunteers" note="CSV, Excel, XML, JSON, text, Word or PDF.">
            <Button variant="contained" onClick={() => navigate('../import', { relative: 'path' })}>Import file</Button>
          </Section>
        )}
        <OrgSection />
        <FieldsSection />
        <TeamsSection members={members} />
        <MembersSection members={members} reloadMembers={reload} />
        <AtprotoSection />
        {me.role === 'admin' && (
          <Section title="Export" note="The JSON file keeps IDs, so other tools can import it.">
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {['volunteers', 'tasks', 'asks', 'spots'].map((k) => <Button key={k} size="small" variant="outlined" href={path(`/export/${k}.csv`)}>Export {k} (CSV)</Button>)}
              <Button size="small" variant="outlined" href={path('/export.json')}>Export all as JSON</Button>
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
