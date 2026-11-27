import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, FormControl, FormControlLabel, IconButton, InputLabel, Link, List, ListItem,
  ListItemText, MenuItem, Select, Stack, Switch, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import MergeIcon from '@mui/icons-material/MergeType';
import { Menu } from '@mui/material';
import { StatusBadge } from './common';
import { TagChip } from './tags';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { peopleWords } from './membership';
import { Help, Page, Section, errorText, useDialogs, useLoad } from './common';
import { FIELD_TYPE_TEXT } from '../format';
import BackIcon from '@mui/icons-material/ArrowBack';
import ChevronIcon from '@mui/icons-material/ChevronRight';
import { Card, Divider, ListItemButton } from '@mui/material';
import { BROWSER_DEMO, StartOverButton } from '../demoMode';
import type { FieldType } from '../../shared/types';

const TYPE_TEXT = FIELD_TYPE_TEXT;

const ROLE: Record<string, string> = { admin: 'Admin', coordinator: 'Coordinator', lead: 'Team lead' };
const ADD_ROLE: Record<string, string> = { admin: 'Add admin', coordinator: 'Add coordinator', lead: 'Add team lead' };

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
    <TextField placeholder={label} sx={{ width: 160 }} slotProps={{ htmlInput: { 'aria-label': label } }} onKeyDown={async (e) => {
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
  const [form, setForm] = useState({ name: org.name, peopleWord: org.peopleWord, weeklyAskLimit: org.weeklyAskLimit, signupUrl: org.signupUrl ?? '' });
  const { error, run } = useAction();
  const [saved, setSaved] = useState(false);
  const admin = me.role === 'admin';
  return (
    <Section>
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        {saved && <Alert severity="success">Saved</Alert>}
        <TextField label="Organization name" value={form.name} disabled={!admin} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <FormControl fullWidth>
          <InputLabel id="people-word">What you call your people</InputLabel>
          <Select labelId="people-word" label="What you call your people" value={form.peopleWord} disabled={!admin} onChange={(e) => setForm({ ...form, peopleWord: e.target.value as typeof form.peopleWord })}>
            <MenuItem value="volunteers">Volunteers</MenuItem>
            <MenuItem value="members">Members</MenuItem>
            <MenuItem value="participants">Participants</MenuItem>
          </Select>
        </FormControl>
        <Box>
          <TextField label="Asks per person each week" type="number" disabled={!admin} value={form.weeklyAskLimit} sx={{ maxWidth: 240 }}
            onChange={(e) => setForm({ ...form, weeklyAskLimit: Number(e.target.value) })} slotProps={{ htmlInput: { min: 1, max: 14 } }} />
          <Help sx={{ mt: 0.75 }}>The most times one person is asked to help in 7 days. It keeps the same few from being asked every time.</Help>
        </Box>
        <Box>
          <TextField label="Your sign-up page" placeholder="https://" disabled={!admin} value={form.signupUrl} onChange={(e) => setForm({ ...form, signupUrl: e.target.value })} />
          <Help sx={{ mt: 0.75 }}>Optional. Public task pages link here, for people who aren't on your list yet.</Help>
        </Box>
        {admin && <Box><Button variant="contained" onClick={async () => { if (await run(() => api(path(''), { method: 'PATCH', body: form }))) { setSaved(true); reload(); } }}>Save</Button></Box>}
      </Stack>
    </Section>
  );
}

function MembershipSection() {
  const { org, path, reload, me } = useOrg();
  const { error, run } = useAction();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    renewalDays: org.renewalDays, renewalUrl: org.renewalUrl ?? '', joinOpen: org.joinOpen, trackRenewals: org.trackRenewals, renewalMode: org.renewalMode,
  });
  const admin = me.role === 'admin';
  const joinLink = `${location.origin}/join/${org.id}`;
  const save = async (body: unknown) => {
    if (await run(() => api(path(''), { method: 'PATCH', body }))) { setSaved(true); reload(); }
  };
  return (
    <Section>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {saved && <Alert severity="success">Saved</Alert>}
        <Box>
          <Typography variant="h3" component="h3">Membership types</Typography>
          <Help sx={{ mb: 1 }}>Such as Individual, Family or Student. Each person can have one.</Help>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            {org.memberCategories.map((c) => (
              <Chip key={c} size="small" label={c} onDelete={admin ? () => save({ memberCategories: org.memberCategories.filter((x) => x !== c) }) : undefined} />
            ))}
            {admin && <AddOnEnter label="Add type" onAdd={(v) => save({ memberCategories: [...org.memberCategories, v] })} />}
          </Stack>
        </Box>
        <Box>
          <FormControlLabel control={<Switch size="small" disabled={!admin} checked={form.trackRenewals} onChange={(e) => setForm({ ...form, trackRenewals: e.target.checked })} />} label="Track renewals and dues" />
          <Help>Adds an expiry date and a dues date to each person, and renewal reminders.</Help>
        </Box>
        {form.trackRenewals && (
          <FormControl fullWidth>
            <InputLabel id="renewal-mode">Renewal reminders</InputLabel>
            <Select labelId="renewal-mode" label="Renewal reminders" value={form.renewalMode} disabled={!admin} onChange={(e) => setForm({ ...form, renewalMode: e.target.value as 'auto' | 'manual' })}>
              <MenuItem value="auto">Send automatically</MenuItem>
              <MenuItem value="manual">Send from Reports</MenuItem>
            </Select>
          </FormControl>
        )}
        {form.trackRenewals && <Stack direction="row" spacing={1.5}>
          {form.renewalMode === 'auto' && <TextField label="Renewal reminder days" type="number" disabled={!admin} value={form.renewalDays} sx={{ width: 200, flexShrink: 0 }}
            onChange={(e) => setForm({ ...form, renewalDays: Number(e.target.value) })} slotProps={{ htmlInput: { min: 0, max: 120 } }} />}
          <TextField label="Renewal link" placeholder="https://" disabled={!admin} value={form.renewalUrl} onChange={(e) => setForm({ ...form, renewalUrl: e.target.value })} />
        </Stack>}
        <Box>
          <FormControlLabel control={<Switch size="small" disabled={!admin} checked={form.joinOpen} onChange={(e) => setForm({ ...form, joinOpen: e.target.checked })} />} label="Accept applications online" />
          <Help>Gives you a public form where adults apply. You accept or decline each one.</Help>
        </Box>
        {org.joinOpen && <TextField label="Application form link" value={joinLink} slotProps={{ htmlInput: { readOnly: true } }} />}
        {admin && <Box><Button variant="contained" onClick={() => save(form)}>Save</Button></Box>}
      </Stack>
    </Section>
  );
}

function FieldsSection() {
  const { fields, path, reload, me, setup } = useOrg();
  const dialogs = useDialogs();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('one');
  const { error, run } = useAction();
  const canEdit = me.role !== 'lead';
  // Opening this page is the "choose what to track" step of the setup guide.
  const seen = setup.steps.find((x) => x.key === 'details')?.done;
  useEffect(() => {
    if (!seen && canEdit) api(path('/setup'), { method: 'PATCH', body: { seen: 'details' } }).then(reload, () => undefined);
  }, [seen, canEdit, path, reload]);
  return (
    <Section>
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      <Help sx={{ mb: 2 }}>What you track about each person. A task can require a field, and People can filter by one. Change these to fit your group.</Help>
      <Stack spacing={2} divider={<Divider />}>
        {fields.map((f) => (
          <Box key={f.id}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h3" sx={{ flex: 1 }}>{f.label}</Typography>
              <Typography variant="body2" color="text.secondary">{TYPE_TEXT[f.type]}</Typography>
              {canEdit && <IconButton size="small" aria-label={`Delete ${f.label}`} onClick={async () => (await dialogs.confirm({ title: `Delete ${f.label}?`, confirm: 'Delete field', destructive: true })) && run(() => api(path(`/fields/${f.id}`), { method: 'DELETE' })).then(reload)}><DeleteIcon fontSize="small" /></IconButton>}
            </Stack>
            {(f.type === 'one' || f.type === 'many') && (
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.5, alignItems: 'center' }}>
                {f.options.map((o) => (
                  <Chip key={o} size="small" label={o} onDelete={canEdit ? () => run(() => api(path(`/fields/${f.id}`), { method: 'PATCH', body: { options: f.options.filter((x) => x !== o) } })).then(reload) : undefined} />
                ))}
                {canEdit && <AddOnEnter label="Add option" onAdd={(v) => run(() => api(path(`/fields/${f.id}`), { method: 'PATCH', body: { options: [...f.options, v] } })).then(reload)} />}
              </Stack>
            )}
          </Box>
        ))}
        {canEdit && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-end' } }}>
            <TextField label="New field name" value={label} onChange={(e) => setLabel(e.target.value)} />
            <FormControl sx={{ minWidth: 140 }} fullWidth>
              <InputLabel id="new-type">Type</InputLabel>
              <Select labelId="new-type" label="Type" value={type} onChange={(e) => setType(e.target.value as FieldType)}>
                {Object.entries(TYPE_TEXT).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" disabled={!label.trim()} onClick={async () => { if (await run(() => api(path('/fields'), { body: { label, type } }))) { setLabel(''); reload(); } }}>Add field</Button>
          </Stack>
        )}
      </Stack>
    </Section>
  );
}

function TagsSection() {
  const { tags, path, reload, me } = useOrg();
  const dialogs = useDialogs();
  const { error, run } = useAction();
  const [merging, setMerging] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const canEdit = me.role !== 'lead';
  // The "new" marks stay while the coordinator looks, and go when they leave.
  const hadNew = useRef(false);
  hadNew.current = hadNew.current || tags.some((t) => t.isNew);
  useEffect(() => () => {
    if (hadNew.current && canEdit) api(path('/tags/seen'), { body: {} }).then(reload, () => undefined);
  }, [path, canEdit, reload]);

  async function rename(id: string, name: string) {
    const next = await dialogs.prompt({ title: 'Rename tag', label: 'Tag name', confirm: 'Rename' });
    if (next && next !== name && (await run(() => api(path(`/tags/${id}`), { method: 'PATCH', body: { name: next } })))) reload();
  }
  async function remove(id: string, name: string) {
    if ((await dialogs.confirm({ title: `Delete ${name}?`, confirm: 'Delete tag', destructive: true })) && (await run(() => api(path(`/tags/${id}`), { method: 'DELETE' })))) reload();
  }
  async function merge(from: string, into: string) {
    setMerging(null);
    if (await run(() => api(path(`/tags/${from}/merge`), { body: { into } }))) reload();
  }

  return (
    <Section>
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      <Help sx={{ mb: 1.5 }}>Labels you can put on people, tasks and needs, then filter by.</Help>
      <Stack spacing={0.5}>
        {tags.length === 0 && <Typography variant="body2" color="text.secondary">No tags yet</Typography>}
        {tags.map((t) => (
          <Stack key={t.id} direction="row" spacing={1} sx={{ alignItems: 'center', minHeight: 36 }}>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TagChip tag={{ ...t, isNew: false }} size="medium" />
              {t.isNew && <StatusBadge label="New" tone="info" />}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>{t.count} tagged</Typography>
            {canEdit && (
              <>
                <IconButton size="small" aria-label={`Rename ${t.name}`} onClick={() => rename(t.id, t.name)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" aria-label={`Merge ${t.name}`} disabled={tags.length < 2} onClick={(e) => setMerging({ id: t.id, anchor: e.currentTarget })}><MergeIcon fontSize="small" /></IconButton>
                <IconButton size="small" aria-label={`Delete ${t.name}`} onClick={() => remove(t.id, t.name)}><DeleteIcon fontSize="small" /></IconButton>
              </>
            )}
          </Stack>
        ))}
        {canEdit && <Box sx={{ pt: 1 }}><AddOnEnter label="Add tag" onAdd={(v) => run(() => api(path('/tags'), { body: { name: v } })).then(reload)} /></Box>}
      </Stack>
      <Menu open={!!merging} anchorEl={merging?.anchor} onClose={() => setMerging(null)}>
        {tags.filter((t) => t.id !== merging?.id).map((t) => (
          <MenuItem key={t.id} onClick={() => merge(merging!.id, t.id)}>Merge into <Box component="span" sx={{ ml: 0.75, display: 'inline-flex' }}><TagChip tag={{ ...t, isNew: false }} /></Box></MenuItem>
        ))}
      </Menu>
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
    <Section>
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      <Help sx={{ mb: 1.5 }}>Groups of people, such as a sound crew. A lead adds people, and a task can be limited to one team.</Help>
      <List disablePadding>
        {teams.map((t) => (
          <ListItem key={t.id} disableGutters secondaryAction={canEdit && <IconButton size="small" aria-label={`Delete ${t.name}`} onClick={async () => (await dialogs.confirm({ title: `Delete ${t.name}?`, confirm: 'Delete team', destructive: true })) && run(() => api(path(`/teams/${t.id}`), { method: 'DELETE' })).then(reload)}><DeleteIcon fontSize="small" /></IconButton>}>
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
        <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'flex-end' }}>
          <TextField label="Team name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button variant="outlined" disabled={!name.trim()} onClick={async () => { if (await run(() => api(path('/teams'), { body: { name } }))) { setName(''); reload(); } }}>Add team</Button>
        </Stack>
      )}
    </Section>
  );
}

function MembersSection({ members, reloadMembers }: { members: { id: string; email: string; role: string }[]; reloadMembers: () => void }) {
  const { path, me, reload } = useOrg();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const { error, run } = useAction();
  const admin = me.role === 'admin';
  return (
    <Section>
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      <Help sx={{ mb: 1.5 }}>People who sign in to run this. Admins change settings, coordinators manage people and tasks, and team leads manage their own team.</Help>
      <List disablePadding>
        {members.map((m) => (
          <ListItem key={m.id} disableGutters secondaryAction={admin && m.id !== me.memberId && <IconButton size="small" aria-label={`Remove ${m.email}`} onClick={() => run(() => api(path(`/members/${m.id}`), { method: 'DELETE' })).then(reloadMembers)}><DeleteIcon fontSize="small" /></IconButton>}>
            <ListItemText primary={m.email} secondary={ROLE[m.role]} />
          </ListItem>
        ))}
      </List>
      {admin && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1, alignItems: { sm: 'flex-end' } }}>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select value={role} onChange={(e) => setRole(e.target.value)} sx={{ minWidth: 130 }} inputProps={{ 'aria-label': 'Role' }}>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="coordinator">Coordinator</MenuItem>
            <MenuItem value="lead">Team lead</MenuItem>
          </Select>
          <Button variant="outlined" disabled={!email.includes('@')} onClick={async () => { if (await run(() => api(path('/members'), { body: { email, role } }))) { setEmail(''); reloadMembers(); reload(); } }}>{ADD_ROLE[role]}</Button>
        </Stack>
      )}
    </Section>
  );
}

/** Posting open tasks from the organization's own Bluesky account, over AT Protocol. */
function AtprotoSection() {
  const { org, path, reload } = useOrg();
  const dialogs = useDialogs();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { error, run } = useAction();
  return (
    <Section title="Post tasks to Bluesky">
      <Help sx={{ mb: 1.5 }}>Open tasks are posted from your organization's Bluesky account. Nothing about your people is ever posted.</Help>
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {org.atproto ? (
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography sx={{ flex: 1 }}>Connected as <strong>{org.atproto.handle}</strong></Typography>
            <Button color="error" onClick={async () => (await dialogs.confirm({ title: 'Disconnect this account?', confirm: 'Disconnect account', destructive: true })) && run(() => api(path('/atproto'), { method: 'DELETE' })).then(reload)}>Disconnect account</Button>
          </Stack>
          <FormControlLabel control={<Switch size="small" checked={org.publishDefault} onChange={(e) => run(() => api(path(''), { method: 'PATCH', body: { publishDefault: e.target.checked } })).then(reload)} />} label="Post new tasks by default" />
        </Stack>
      ) : (
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField label="Bluesky handle" placeholder="yourgroup.bsky.social" value={identifier} onChange={(e) => setIdentifier(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="App password" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Stack>
          <Link variant="body2" href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener">Create app password</Link>
          <Box><Button variant="contained" disabled={!identifier || !password} onClick={async () => { if (await run(() => api(path('/atproto'), { body: { identifier, appPassword: password } }))) { setPassword(''); reload(); } }}>Connect account</Button></Box>
        </Stack>
      )}
    </Section>
  );
}

interface SectionInfo { key: string; title: string; help: string }

/** The settings menu: what each page is, in a line. */
function sections(o: { admin: boolean; lead: boolean; bluesky: boolean; people: string }): SectionInfo[] {
  return [
    { key: 'organization', title: 'Organization', help: 'Name, your sign-up page and how often people are asked' },
    { key: 'fields', title: 'Custom fields', help: `What you track about ${o.people}` },
    { key: 'tags', title: 'Tags', help: 'Labels for people, tasks and needs' },
    { key: 'teams', title: 'Teams', help: 'Groups of people, each with a lead' },
    { key: 'membership', title: 'Membership', help: 'Membership types, renewals and applications' },
    { key: 'admins', title: 'Admins and coordinators', help: 'Who can sign in, and what they can do' },
    ...(o.lead ? [] : [{ key: 'data', title: 'Import and export', help: 'Bring in a list, or download your data' }]),
    ...(o.admin ? [{ key: 'advanced', title: 'Advanced', help: o.bluesky ? 'Post tasks to Bluesky, or delete this organization' : 'Delete this organization' }] : []),
  ];
}

export function Settings() {
  const { path, me, org, setup, atprotoReady, reload: reloadOrg } = useOrg();
  const navigate = useNavigate();
  const { section } = useParams();
  const { data, reload } = useLoad(() => api(path('/members')), [path]);
  const members = data?.members ?? [];
  const words = peopleWords(org.peopleWord);
  const admin = me.role === 'admin';
  // Bluesky posting waits until setup is out of the way, and until it can work.
  const bluesky = admin && atprotoReady && (setup.finished || setup.hidden || org.sample || !!org.atproto);
  const list = sections({ admin, lead: me.role === 'lead', bluesky, people: words.people });
  const current = list.find((s) => s.key === section);
  const open = (key: string) => navigate(`/o/${org.id}/settings/${key}`);

  if (current) {
    return (
      <Page title={current.title} width={760}
        back={<Button size="small" startIcon={<BackIcon fontSize="small" />} onClick={() => navigate(`/o/${org.id}/settings`)} sx={{ color: 'text.secondary', ml: -1 }}>Settings</Button>}>
        <Stack spacing={2}>
          {current.key === 'organization' && <OrgSection />}
          {current.key === 'fields' && <FieldsSection />}
          {current.key === 'tags' && <TagsSection />}
          {current.key === 'teams' && <TeamsSection members={members} />}
          {current.key === 'membership' && <MembershipSection />}
          {current.key === 'admins' && <MembersSection members={members} reloadMembers={reload} />}
          {current.key === 'data' && (
            <>
              <Section title={`Import ${words.people}`}>
                <Help sx={{ mb: 1.5 }}>Upload a spreadsheet, or the export from the tool you use now.</Help>
                <Button variant="contained" onClick={() => navigate(`/o/${org.id}/import`)}>Import a list</Button>
              </Section>
              {admin && (
                <Section title="Export">
                  <Help sx={{ mb: 1.5 }}>Download everything as spreadsheets, or as one file another tool can read.</Help>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {[['volunteers', words.people], ['tasks', 'tasks'], ['asks', 'asks'], ['spots', 'spots']].map(([k, label]) => <Button key={k} size="small" variant="outlined" href={path(`/export/${k}.csv`)}>Export {label} (CSV)</Button>)}
                    <Button size="small" variant="outlined" href={path('/export.json')}>Export all as JSON</Button>
                  </Stack>
                </Section>
              )}
            </>
          )}
          {current.key === 'advanced' && (
            <>
              {bluesky && <AtprotoSection />}
              <DeleteOrgSection />
            </>
          )}
        </Stack>
      </Page>
    );
  }

  return (
    <Page title="Settings" width={760}>
      <Stack spacing={2}>
        {!org.sample && me.role !== 'lead' && !setup.finished && (
          <Card>
            <ListItemButton onClick={async () => { await api(path('/setup'), { method: 'PATCH', body: { hidden: false } }); await reloadOrg(); navigate(`/o/${org.id}/today`); }} sx={{ px: 2.5, py: 1.75, gap: 1.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h3" component="h2">Setup guide</Typography>
                <Typography variant="body2" color="text.secondary">{setup.done} of {setup.total} done</Typography>
              </Box>
              <ChevronIcon fontSize="small" sx={{ color: 'text.disabled' }} />
            </ListItemButton>
          </Card>
        )}
        <Card component="nav" aria-label="Settings">
          {list.map((s, i) => (
            <Box key={s.key}>
              {i > 0 && <Divider />}
              <ListItemButton onClick={() => open(s.key)} sx={{ borderRadius: 0, px: 2.5, py: 1.75, gap: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h3" component="h2">{s.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.help}</Typography>
                </Box>
                <ChevronIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              </ListItemButton>
            </Box>
          ))}
        </Card>
        <Box>
          {BROWSER_DEMO
            ? <StartOverButton />
            : <Button onClick={async () => { await api('/api/auth/logout', { body: {} }); location.href = '/login'; }}>Sign out</Button>}
        </Box>
        <Typography variant="body2" color="text.secondary">{me.email}</Typography>
      </Stack>
    </Page>
  );
}

function DeleteOrgSection() {
  const { org, path } = useOrg();
  const dialogs = useDialogs();
  const [problem, setProblem] = useState<string | null>(null);

  async function remove() {
    const ok = await dialogs.confirm({ title: `Delete ${org.name}?`, confirm: 'Delete organization', destructive: true });
    if (!ok) return;
    try {
      await api(path(''), { method: 'DELETE' });
      location.href = '/';
    } catch (e) {
      setProblem(errorText(e));
    }
  }

  return (
    <Section title="Delete organization">
      <Help sx={{ mb: 1.5 }}>Removes the organization, its people, tasks and history for everyone. Export first if you want a copy.</Help>
      {problem && <Alert severity="error" sx={{ mb: 2 }}>{problem}</Alert>}
      <Button color="error" variant="outlined" onClick={remove}>Delete organization</Button>
    </Section>
  );
}
