import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, FormControl, FormControlLabel, InputLabel, LinearProgress, Link, MenuItem, Radio, RadioGroup, Select, Stack, TextField, Typography,
} from '@mui/material';
import { Wordmark } from '../Wordmark';
import { Mascot } from '../Mascot';
import { api } from '../api';
import { Help, Loading, errorText } from './common';
import { CURRENT_TOOLS, PEOPLE_WORDS, SIZE_BANDS, type PeopleWord } from '../../shared/membership';

// Creating an organization (docs/specs/setup-guide.md): one question on each
// screen, in the order a person would say it. Name, how to reach them, a few
// details, then the emailed code. The account and the organization are made
// together at the end, so nothing is half set up if they stop.

interface Draft {
  name: string;
  peopleWord: PeopleWord;
  email: string;
  website: string;
  size: string;
  currentTool: string;
  toolName: string;
  adultsConfirmed: boolean;
}

const EMPTY: Draft = { name: '', peopleWord: 'volunteers', email: '', website: '', size: '', currentTool: '', toolName: '', adultsConfirmed: false };
const KEY = 'signup-draft';
const WORD_TEXT: Record<PeopleWord, string> = { volunteers: 'Volunteers', members: 'Members', participants: 'Participants' };
const TOOL_TEXT: Record<(typeof CURRENT_TOOLS)[number], string> = { 'Nothing yet': 'Nowhere yet', 'A spreadsheet': 'A spreadsheet', 'Paid software': 'Another tool' };

type StepKey = 'name' | 'contact' | 'details' | 'verify';

function loadDraft(): Draft {
  try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(KEY) ?? '{}') }; } catch { return EMPTY; }
}

export function Signup() {
  const navigate = useNavigate();
  const [signedInAs, setSignedInAs] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [at, setAt] = useState(0);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me', { credentials: 'same-origin' }).then(async (r) => setSignedInAs(r.ok ? (await r.json()).email : null)).catch(() => setSignedInAs(null));
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* fine without it */ }
  }, [draft]);

  if (signedInAs === undefined) return <Loading />;
  // Someone already signed in has no email to give and no code to enter.
  const steps: StepKey[] = signedInAs ? ['name', 'details'] : ['name', 'contact', 'details', 'verify'];
  const step = steps[Math.min(at, steps.length - 1)];
  const last = at === steps.length - 1;
  const set = (k: keyof Draft, v: string | boolean) => setDraft({ ...draft, [k]: v });

  const text: Record<StepKey, { title: string; help: string }> = {
    name: { title: 'What is your organization called?', help: `${steps.length} short steps. Start with the name your people know you by.` },
    contact: { title: 'How do we reach you?', help: 'We email you a 6 digit code to sign in. There is no password.' },
    details: { title: 'Tell us about your group', help: 'We review each new organization before it can send email. These answers help.' },
    verify: { title: 'Check your email', help: `Enter the code we sent to ${draft.email}.` },
  };
  const ready: Record<StepKey, boolean> = {
    name: draft.name.trim() !== '',
    contact: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()),
    details: draft.adultsConfirmed,
    verify: code.length === 6,
  };

  async function sendCode() {
    const res = await api<{ sent: boolean; devCode?: string }>('/api/auth/start', { body: { email: draft.email.trim() } });
    setDevCode(res.devCode ?? null);
    setCode('');
  }

  async function create() {
    const res = await api<{ id: string }>('/api/orgs', { body: { ...draft, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone } });
    try { sessionStorage.removeItem(KEY); } catch { /* fine */ }
    // A full load, so the app starts signed in. The setup guide is waiting on Today.
    location.href = `/o/${res.id}/today`;
  }

  async function next(e: React.FormEvent) {
    e.preventDefault();
    if (!ready[step] || busy) return;
    setProblem(null);
    setBusy(true);
    try {
      if (step === 'verify') {
        await api('/api/auth/verify', { body: { email: draft.email.trim(), code } });
        await create();
      } else if (last) {
        await create();
      } else {
        if (steps[at + 1] === 'verify') await sendCode();
        setAt(at + 1);
        setBusy(false);
      }
    } catch (err) {
      setProblem(errorText(err));
      setBusy(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, py: { xs: 4, md: 8 } }}>
      <Box component="a" href="/" aria-label="Home" sx={{ display: 'inline-block', mb: 3, color: 'text.primary' }}><Wordmark height={28} /></Box>
      <Typography variant="caption" component="p" sx={{ mb: 0.75 }}>Step {at + 1} of {steps.length}</Typography>
      <LinearProgress variant="determinate" value={((at + 1) / steps.length) * 100} aria-label="Sign-up progress" sx={{ height: 6, borderRadius: 3, mb: 3 }} />
      <form onSubmit={next}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Mascot />
            <Help>{text[step].help}</Help>
          </Stack>
          <Typography variant="h1" component="h1" sx={{ fontSize: '1.75rem' }}>{text[step].title}</Typography>
          {problem && <Alert severity="error">{problem}</Alert>}

          {step === 'name' && (
            <>
              <TextField label="Organization name" required autoFocus value={draft.name} onChange={(e) => set('name', e.target.value)} />
              <FormControl>
                <Typography id="people-word" sx={{ fontWeight: 600, mb: 0.5 }}>What you call your people</Typography>
                <RadioGroup aria-labelledby="people-word" value={draft.peopleWord} onChange={(e) => set('peopleWord', e.target.value)}>
                  {PEOPLE_WORDS.map((w) => <FormControlLabel key={w} value={w} control={<Radio />} label={WORD_TEXT[w]} />)}
                </RadioGroup>
              </FormControl>
            </>
          )}

          {step === 'contact' && (
            <>
              <TextField label="Your email" type="email" autoComplete="email" required autoFocus value={draft.email} onChange={(e) => set('email', e.target.value)} />
              <TextField label="Website (optional)" placeholder="example.org" value={draft.website} onChange={(e) => set('website', e.target.value)} />
            </>
          )}

          {step === 'details' && (
            <>
              <FormControl fullWidth>
                <InputLabel id="org-size">How many {draft.peopleWord}</InputLabel>
                <Select labelId="org-size" label={`How many ${draft.peopleWord}`} value={draft.size} onChange={(e) => set('size', e.target.value)}>
                  {SIZE_BANDS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="org-tool">Where your list is today</InputLabel>
                <Select labelId="org-tool" label="Where your list is today" value={draft.currentTool} onChange={(e) => set('currentTool', e.target.value)}>
                  {CURRENT_TOOLS.map((t) => <MenuItem key={t} value={t}>{TOOL_TEXT[t]}</MenuItem>)}
                </Select>
              </FormControl>
              {draft.currentTool === 'Paid software' && <TextField label="Which tool" value={draft.toolName} onChange={(e) => set('toolName', e.target.value)} />}
              <FormControlLabel control={<Checkbox checked={draft.adultsConfirmed} onChange={(e) => set('adultsConfirmed', e.target.checked)} />} label="Everyone on our roster is 18 or older" />
            </>
          )}

          {step === 'verify' && (
            <>
              {devCode && <Alert severity="info">Test mode code: <strong>{devCode}</strong></Alert>}
              <TextField label="Verification code" inputMode="numeric" autoComplete="one-time-code" required autoFocus value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              <Box><Link component="button" type="button" variant="body2" onClick={() => sendCode().then(() => setProblem(null), (err) => setProblem(errorText(err)))}>Send a new code</Link></Box>
            </>
          )}

          <Stack direction="row" spacing={1}>
            {at > 0 && <Button onClick={() => { setProblem(null); setAt(at - 1); }}>Back</Button>}
            <Button type="submit" variant="contained" size="large" disabled={busy || !ready[step]}>{last ? 'Create organization' : 'Next'}</Button>
          </Stack>
        </Stack>
      </form>
      {at === 0 && (
        <Stack spacing={0.5} sx={{ mt: 4, alignItems: 'flex-start' }}>
          {signedInAs
            ? <Button onClick={() => navigate('/start?choose=1')}>Your organizations</Button>
            : <Button onClick={() => navigate('/login')}>Sign in instead</Button>}
          <Button onClick={() => navigate(signedInAs ? '/start?demo=1' : `/login?next=${encodeURIComponent('/start?demo=1')}`)}>Look around a sample first</Button>
        </Stack>
      )}
    </Box>
  );
}
