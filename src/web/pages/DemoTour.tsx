import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, IconButton, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { errorText } from './common';
import { FONT_DISPLAY } from '../theme';

// The five stops from docs/specs/onboarding.md, as a card that follows the
// person through the sample organization. Each stop shows a screen that
// exists and asks about the person's own organization, because the point of
// the demo is to learn where their volunteer work backs up. It's the one
// place in the app with explanatory text, and it shows only in a sample
// organization.
const STOPS: { path: string; title: string; body: string; ask: string; action?: 'volunteer' }[] = [
  {
    path: 'today',
    title: 'Today',
    body: 'The work that needs attention now, and who is holding each spot.',
    ask: 'Is this the list you\'d start your day with? What\'s on yours that isn\'t here?',
  },
  {
    path: 'people',
    title: 'People',
    body: 'The volunteers this pantry already has, with tags, tiers and availability.',
    ask: 'How close is this to what you know about your people?',
  },
  {
    path: 'tasks',
    title: 'Who to ask',
    body: 'Open Spanish intake desk. It shows who fits, who goes first and who has waited longest.',
    ask: 'How do you decide who to ask? Who gets asked too often?',
  },
  {
    path: 'tasks',
    title: 'What a volunteer sees',
    body: 'A page on their phone with the task and two buttons. No account.',
    ask: 'How do your volunteers hear from you now, and what do they do to answer?',
    action: 'volunteer',
  },
  {
    path: 'settings',
    title: 'Tags',
    body: 'Groups the tool proposed from the tasks and people, with one waiting to be merged.',
    ask: 'What would you group your people by?',
  },
];

export function DemoTour() {
  const { org, path } = useOrg();
  const navigate = useNavigate();
  const theme = useTheme();
  const { vt } = theme;
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const key = `tour:${org.id}`;
  const [stop, setStop] = useState(() => {
    try { return Number(localStorage.getItem(key) ?? 0); } catch { return 0; }
  });
  const [problem, setProblem] = useState<string | null>(null);

  if (!org.sample || stop >= STOPS.length) return null;
  const s = STOPS[stop];
  const save = (n: number) => {
    try { localStorage.setItem(key, String(n)); } catch { /* fine without it */ }
    setStop(n);
    setProblem(null);
  };
  const go = (n: number) => {
    save(n);
    if (n < STOPS.length) navigate(`/o/${org.id}/${STOPS[n].path}`);
  };

  async function openVolunteer() {
    try {
      const res = await api<{ link: string }>(path('/demo/volunteer-link'), { body: {} });
      window.open(res.link, '_blank', 'noopener');
    } catch (e) {
      setProblem(errorText(e));
    }
  }

  const lime = { bgcolor: vt.lime, color: vt.onLime, '&:hover': { bgcolor: '#B3E12A' } };
  return (
    <Card role="region" aria-label="Demo" sx={{
      position: 'fixed', zIndex: 1200, bgcolor: vt.ink, color: vt.onInk, boxShadow: vt.shadowPop,
      ...(wide ? { left: 256, bottom: 24, width: 380 } : { left: 12, right: 12, bottom: 72 }),
    }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" component="p" sx={{ color: vt.lime, fontWeight: 600 }}>Demo · {stop + 1} of {STOPS.length}</Typography>
            <Typography component="h2" sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.015em', lineHeight: 1.2 }}>{s.title}</Typography>
          </Box>
          <IconButton size="small" aria-label="Close demo" onClick={() => save(STOPS.length)} sx={{ color: vt.onInk2, mt: -0.5, mr: -0.75 }}><CloseIcon fontSize="small" /></IconButton>
        </Stack>
        <Typography variant="body2" sx={{ color: vt.onInk, mt: 1 }}>{s.body}</Typography>
        <Typography variant="body2" sx={{ color: vt.onInk2, mt: 1, fontStyle: 'italic' }}>{s.ask}</Typography>
        {problem && <Typography variant="body2" sx={{ color: vt.tangerine, mt: 1 }}>{problem}</Typography>}
        <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
          {stop > 0 && <Button size="small" onClick={() => go(stop - 1)} sx={{ color: vt.onInk2 }}>Back</Button>}
          {s.action === 'volunteer' && <Button size="small" variant="outlined" onClick={openVolunteer} sx={{ color: vt.onInk, borderColor: vt.onInk, '&:hover': { borderColor: vt.onInk, bgcolor: 'rgba(255,255,255,0.08)' } }}>Open volunteer page</Button>}
          <Button size="small" variant="contained" onClick={() => go(stop + 1)} sx={lime}>{stop === STOPS.length - 1 ? 'Done' : 'Next'}</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
