import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { Section, StatusBadge, errorText, useLoad, type Tone } from './common';
import { api } from '../api';
import { membershipState, type MembershipState, type PeopleWord } from '../../shared/membership';

export const MEMBERSHIP_TEXT: Record<Exclude<MembershipState, 'none'>, [string, Tone]> = {
  current: ['Current', 'success'],
  expiring: ['Expiring', 'warning'],
  expired: ['Expired', 'danger'],
};

/** "2026-11-25" for a date input, from milliseconds. */
export function dateInput(ms: number | null): string {
  return ms === null ? '' : new Date(ms).toISOString().slice(0, 10);
}

export function MembershipBadge({ expiresAt, renewalDays }: { expiresAt: number | null; renewalDays: number }) {
  const state = membershipState(expiresAt, Date.now(), renewalDays);
  if (state === 'none') return null;
  const [label, tone] = MEMBERSHIP_TEXT[state];
  return <StatusBadge label={label} tone={tone} />;
}

export interface MembershipForm {
  memberCategory: string;
  memberSince: string;
  memberExpiresAt: string;
  duesPaidAt: string;
}

export function MembershipFields({ value, onChange, categories, disabled, expiresAt, renewalDays, trackRenewals }: {
  value: MembershipForm;
  onChange: (m: Partial<MembershipForm>) => void;
  categories: string[];
  disabled?: boolean;
  expiresAt: number | null;
  renewalDays: number;
  /** Expiry, dues and the renewal badge show only when the organization tracks renewals. */
  trackRenewals: boolean;
}) {
  const date = (key: keyof MembershipForm, label: string) => (
    <TextField label={label} type="date" value={value[key]} disabled={disabled} onChange={(e) => onChange({ [key]: e.target.value })}
      slotProps={{ inputLabel: { shrink: true } }} fullWidth />
  );
  return (
    <Stack spacing={2}>
      {trackRenewals && <MembershipBadge expiresAt={expiresAt} renewalDays={renewalDays} />}
      {categories.length > 0 ? (
        <FormControl fullWidth>
          <InputLabel id="member-category">Category</InputLabel>
          <Select labelId="member-category" label="Category" value={value.memberCategory} disabled={disabled} onChange={(e) => onChange({ memberCategory: e.target.value })}>
            <MenuItem value="">Not set</MenuItem>
            {[...new Set([...categories, value.memberCategory].filter(Boolean))].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
      ) : (
        <TextField label="Category" value={value.memberCategory} disabled={disabled} onChange={(e) => onChange({ memberCategory: e.target.value })} />
      )}
      {date('memberSince', 'Member since')}
      {trackRenewals && date('memberExpiresAt', 'Expires')}
      {trackRenewals && date('duesPaidAt', 'Dues paid')}
    </Stack>
  );
}

/** The words for the people in an organization. */
export function peopleWords(word: PeopleWord | undefined) {
  const plural = word ?? 'volunteers';
  const singular = plural.slice(0, -1);
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  return { people: plural, person: singular, People: cap(plural), Person: cap(singular) };
}

interface Application {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  category: string | null;
  note: string;
  createdAt: number;
}

/** People who applied on the public page, with Accept and Decline. Shows nothing when there are none. */
export function Applications({ path, onChange }: { path: (p: string) => string; onChange: () => void }) {
  const { data, reload } = useLoad(() => api<{ applications: Application[] }>(path('/applications')), [path]);
  const [problem, setProblem] = useState<string | null>(null);
  if (!data || data.applications.length === 0) return null;
  const act = async (id: string, what: 'accept' | 'decline') => {
    setProblem(null);
    try {
      await api(path(`/applications/${id}/${what}`), { body: {} });
      await reload();
      onChange();
    } catch (err) {
      setProblem(errorText(err));
    }
  };
  return (
    <Section title={`Applications (${data.applications.length})`}>
      {problem && <Alert severity="error" sx={{ mb: 1.5 }}>{problem}</Alert>}
      <Stack spacing={1.5} divider={<Divider />}>
        {data.applications.map((a) => (
          <Stack key={a.id} direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h3">{a.name}</Typography>
              <Typography variant="body2" color="text.secondary">{[a.email, a.phone, a.category].filter(Boolean).join(' · ')}</Typography>
              {a.note && <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{a.note}</Typography>}
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Button onClick={() => act(a.id, 'decline')}>Decline</Button>
              <Button variant="contained" onClick={() => act(a.id, 'accept')}>Accept</Button>
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Section>
  );
}

/** Write one email to the people shown. The server leaves out anyone who can't be emailed. */
export function MessageDialog({ path, volunteerIds, onClose }: { path: (p: string) => string; volunteerIds: string[]; onClose: () => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<{ recipients: number; sent: number; notSent: number; reason: string | null } | null>(null);
  const send = async () => {
    setBusy(true);
    setProblem(null);
    try {
      setResult(await api(path('/messages'), { body: { subject, body, volunteerIds } }));
    } catch (err) {
      setProblem(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  const NOT_SENT: Record<string, string> = { off: 'Email is off', limit: 'Daily limit reached', failed: 'Email failed' };
  return (
    <Dialog open fullWidth maxWidth="sm" onClose={onClose}>
      <DialogTitle>{result ? `Sent ${result.sent} of ${result.recipients}` : `Email ${volunteerIds.length} people`}</DialogTitle>
      <DialogContent>
        {result ? (
          result.notSent > 0 && result.reason && <Alert severity="warning">{NOT_SENT[result.reason] ?? 'Not sent'}</Alert>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {problem && <Alert severity="error">{problem}</Alert>}
            <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <TextField label="Message" multiline minRows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {result ? <Button variant="contained" onClick={onClose}>Done</Button> : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" disabled={busy || !subject.trim() || !body.trim()} onClick={send}>Send</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
