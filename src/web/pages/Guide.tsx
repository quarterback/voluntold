import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Button, Divider, IconButton, ListSubheader, Menu, MenuItem, Stack, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ListIcon from '@mui/icons-material/FormatListBulletedOutlined';
import HelpIcon from '@mui/icons-material/HelpOutlineOutlined';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { errorText } from './common';
import { FONT_DISPLAY } from '../theme';
import { sampleKind } from '../../shared/samples';

// The demo guide (docs/specs/demo.md). It sits beside the real screens in a
// sample organization and explains every feature: what it does, how it's
// meant to work, what to try and the question we want answered. Guided mode
// walks the stops in order. Explore mode lets the person go anywhere and
// introduces each section the first time they open it. It's the one place in
// the app with explanatory text.

type Group = 'start' | 'today' | 'needs' | 'tasks' | 'people' | 'offers' | 'volunteers' | 'import' | 'settings' | 'end';

const GROUP_NAME: Record<Group, string> = {
  start: 'Start', today: 'Today', needs: 'Needs', tasks: 'Tasks', people: 'People', offers: 'First offers', volunteers: 'What volunteers see', import: 'Import', settings: 'Settings', end: 'Your turn',
};

// Which guide section a screen belongs to, by the first part of its route.
const ROUTE_GROUP: Record<string, Group> = { today: 'today', needs: 'needs', tasks: 'tasks', people: 'people', offers: 'offers', import: 'import', settings: 'settings' };

interface Helpers { get: (p: string) => Promise<any> }

interface Stop {
  group: Group;
  title: string;
  body: string;
  tryIt?: string;
  ask?: string;
  path: string | ((h: Helpers) => Promise<string>);
  action?: 'volunteer' | 'feedback';
}

const firstOpenTask = async ({ get }: Helpers) => {
  const r = await get('/tasks');
  const t = r.tasks.find((x: any) => x.status === 'open' && x.waiting > 0) ?? r.tasks.find((x: any) => x.status === 'open') ?? r.tasks[0];
  return t ? `tasks/${t.id}` : 'tasks';
};
const firstNeed = async ({ get }: Helpers) => {
  const r = await get('/needs');
  return r.needs[0] ? `needs/${r.needs[0].id}` : 'needs';
};
const firstPerson = async ({ get }: Helpers) => {
  const r = await get('/volunteers');
  const v = r.volunteers.find((x: any) => x.lastAskedAt) ?? r.volunteers[0];
  return v ? `people/${v.id}` : 'people';
};

const STOPS: Stop[] = [
  {
    group: 'start', path: 'today', title: 'How this demo works',
    body: "This is a sample organization. The people in it are made up, and anything you do here stays in your copy. The guide explains each feature as you reach it. Guided takes you through the stops in order. Explore lets you go anywhere, and the guide introduces a section the first time you open it.",
    tryIt: 'Switch between Guided and Explore at the top of this panel.',
    ask: "As you go, note what your organization would need that isn't here, and what you'd leave out.",
  },
  {
    group: 'today', path: 'today', title: 'Start with what needs a decision',
    body: "Today lists what a coordinator has to decide. New volunteers are ready for their first ask. A need has work to offer, or a gap nobody fits. A task is due for its next round of asks. A volunteer has reported a problem. Someone stopped answering and was paused.",
    tryIt: 'Tap a line to open the screen where you decide. The guide follows you.',
    ask: "Is this the list you'd start your day with? What's on yours that isn't here?",
  },
  {
    group: 'today', path: 'today', title: "See the week ahead and how many people you have",
    body: "This week shows the work coming up and how many spots are filled. Capacity shows how many approved people you have, how many you've never asked, how long a new person waits before you ask them anything and how many have said yes twice.",
    ask: 'Which of these numbers would you look at? Which would you ignore?',
  },
  {
    group: 'needs', path: 'needs', title: 'Plan something before it becomes tasks',
    body: "A need is something you want to run, such as a Saturday delivery or a pledge drive. It holds the assignments the work takes, which are ordinary tasks, and the supplies and information you can't start without. The list shows how many assignments have someone who fits and how many have a gap.",
    tryIt: 'Open a need to see its assignments and supplies.',
    ask: 'What do you run that starts as a plan before it becomes tasks?',
  },
  {
    group: 'needs', path: firstNeed, title: 'Check who fits each assignment, then offer it',
    body: "Each assignment shows the person who fits and has waited longest, or a gap when nobody fits. Supplies and information are listed with what you still need. When you tap Offer, Volley publishes the assignments that have people and sends each one its first round of asks.",
    tryIt: 'Mark a supply covered, or tap Offer on an active need.',
    ask: 'Before you ask anyone, what else has to be in place?',
  },
  {
    group: 'tasks', path: 'tasks', title: 'See every task and where it stands',
    body: "A task is a draft, open, filled, canceled or done. The list shows when each one happens, how many spots are filled and how many people haven't answered yet. When a task's time passes, Volley marks it done.",
    tryIt: 'Open a task that is open.',
    ask: "How do you keep track of what's filled today, and where does that live?",
  },
  {
    group: 'tasks', path: 'tasks/new', title: 'Write a task',
    body: "You give a task a title, say what to do and when, name the place in two parts (the public one and the private address), say how many people you need, who to find, what to bring and any files. You can mark it remote, and you can say how many minutes short work takes, so it fits people with little time.",
    tryIt: 'Fill in a task. Save it as a draft, or publish it.',
    ask: "What does one of your tasks need that this form doesn't ask for?",
  },
  {
    group: 'tasks', path: 'tasks/new', title: 'Say who the task needs',
    body: "You write requirements against your own fields: a skill, an experience level, a cleared background check, a certification or a team. Volley asks only the people who meet every requirement.",
    tryIt: 'Add a requirement and pick a field.',
    ask: 'What decides who you can ask for a task? Is that written down anywhere?',
  },
  {
    group: 'tasks', path: 'tasks/new', title: 'Choose how to ask',
    body: "Choose In batches to ask a few people at a time, starting with those who fit and have waited longest. Volley tells you when the next batch is due. Choose All eligible to ask everyone who fits at once; the first to accept get the spots. Choose Manual to pick names yourself. Your organization also sets how many times one person can be asked in a week.",
    tryIt: 'Change the method under Asks and watch the batch fields appear.',
    ask: 'How do you decide who to ask, and who gets asked too often?',
  },
  {
    group: 'tasks', path: firstOpenTask, title: 'Ask a few people, then the next few',
    body: "A task page shows each batch of asks that went out and how it went: who accepted, who declined, whose ask expired and who hasn't answered. When a batch's time is up and spots are still open, Today tells you to ask the next group. The person who has waited longest goes first.",
    tryIt: 'Tap Ask to see the next group and who is in it.',
    ask: "When a task isn't filling, what do you do today?",
  },
  {
    group: 'tasks', path: firstOpenTask, title: 'Send each person a private link',
    body: "Each person you ask gets a private link. You paste the links into the email, text or chat your organization already uses. If someone loses their link, you can reset it, and every link expires before the task starts.",
    tryIt: 'Ask the next group, then Copy all.',
    ask: 'How do your asks go out now, and what would you want sent for you?',
  },
  {
    group: 'tasks', path: firstOpenTask, title: "See who fits, and why the others don't",
    body: "When you ask, Volley lists who fits, longest wait first, and who it can't ask and why: they're missing a requirement, they've hit the weekly limit, they're busy then, they're paused or they haven't agreed to be contacted.",
    tryIt: 'Open Ask and read the Not eligible list.',
    ask: 'Which of these reasons match how you work? Which would you drop?',
  },
  {
    group: 'tasks', path: firstOpenTask, title: 'What happens after someone says yes',
    body: "When a person accepts, they hold a spot. When the task's time passes, Volley counts the spot as attended unless you mark a no-show. A volunteer can cancel their spot, which opens it again, or report a problem, which shows up on Today.",
    tryIt: 'Find a spot and mark it, then undo it.',
    ask: "What happens today when someone says yes and doesn't come?",
  },
  {
    group: 'people', path: 'people', title: 'Everyone you have, in one list',
    body: "Each person has the details your organization chooses to track, plus tags, a tier, their availability and one line that says where they stand with you, such as \"Asked 3 weeks ago, accepted\" or \"Never asked\". The list puts the people who have waited longest at the top, because they're the ones to ask next.",
    tryIt: 'Scroll the list and read a few rows.',
    ask: 'How close is this to what you know about your people?',
  },
  {
    group: 'people', path: 'people', title: "How people are grouped, and when they're free",
    body: "Volley proposes tags from what people can do, marks a new tag until you look at it and lets you merge two. A tier says how often someone volunteers: one time, seasonal, regular or core. Availability is their hours a week, their usual times and whether remote work suits them. Work outside those times doesn't fit them.",
    tryIt: 'Tap a tag or a tier to filter the list.',
    ask: 'What would you group your people by? Do you know their hours?',
  },
  {
    group: 'people', path: 'people', title: 'Filter the list and save it',
    body: "You can filter by any field, tag, tier, team or status, and save a filter as a list, such as Spanish speakers who can lead. A saved list updates itself as people change.",
    tryIt: 'Open Filters, pick a field and Save list.',
    ask: 'Which lists do you keep by hand today?',
  },
  {
    group: 'people', path: firstPerson, title: 'What you keep about one person',
    body: "A person's page holds their details, their teams, their availability and their history: each ask, how they answered and each spot they held. You can pause their asks until a date, resume them or stop them. The person can do the same from their own page.",
    tryIt: 'Change a field and save, or pause asks.',
    ask: "What do you keep about a person that isn't here?",
  },
  {
    group: 'offers', path: 'offers', title: 'Give new volunteers their first ask',
    body: "For each approved person you've never asked, Volley suggests the open work that fits them best: remote work first, then work that uses a skill they have, then the shortest. You approve each suggestion or skip it.",
    tryIt: 'Approve one offer and skip another.',
    ask: 'How long does a new volunteer wait before you ask them for anything?',
  },
  {
    group: 'volunteers', path: firstOpenTask, title: 'What a volunteer sees',
    body: "A volunteer opens their link and sees the task, the time, the place, who to find, what to bring and two buttons. Below that, they see the work they've accepted, with Cancel spot and Report a problem; open work they fit and can accept directly; and their own availability. They never see other volunteers' names.",
    tryIt: 'Open the volunteer page for someone with a pending ask.',
    ask: "Is there anything here you wouldn't want a volunteer to see, or anything missing that they'd need?",
    action: 'volunteer',
  },
  {
    group: 'import', path: 'import', title: 'Bring in the list you already have',
    body: "You can bring in a CSV, Excel, XML or JSON file, or a text, Word or PDF file that a model reads. Volley suggests which column goes to which field, shows likely duplicates side by side and sets aside anyone with no email or phone, because you can't send them a link. This sample has one import on record, and the rest of the demo works without one.",
    ask: 'Where does your list live now, and what shape is it in?',
  },
  {
    group: 'settings', path: 'settings', title: "Decide what you track, and who's on which team",
    body: "Fields are the details you track about volunteers: the four starters, plus anything you add, such as a certification or a background check. You write requirements and filters against them. A team is a group with leads who decide who's on it, and a task can require a team.",
    tryIt: "Add a field or a choice. It appears on every person's record.",
    ask: 'What fields would you add on day one?',
  },
  {
    group: 'settings', path: 'settings', title: 'Who runs the tool, and what can leave it',
    body: "Members run the tool as admins, coordinators or team leads. The weekly ask limit caps how often one person can be asked. You can connect your organization's Bluesky account and post public tasks there; volunteer details stay in Volley. Export downloads everything as CSV and JSON.",
    ask: 'Who at your organization would use this, and what would they need to take with them if they left?',
  },
  {
    group: 'end', path: 'today', title: 'Now it\'s yours to play with',
    body: "You've seen every feature. The sample is yours now: publish tasks, ask people, answer as a volunteer, import a file, change settings. Switch to another sample organization from the name at the top left. When you're done, tell us what fit your organization and what didn't. We'd like to do a walkthrough with you.",
    action: 'feedback',
  },
];

interface GuideState { mode: 'guided' | 'explore'; stop: number; seen: Group[]; open: boolean }
const DEFAULT: GuideState = { mode: 'guided', stop: 0, seen: ['start'], open: true };

const GuideCtx = createContext<{ open: boolean } | null>(null);
export const useGuideOpen = () => useContext(GuideCtx)?.open ?? false;

function load(key: string): GuideState {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(key) ?? '{}') }; } catch { return DEFAULT; }
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const { org } = useOrg();
  const key = `guide:${org.id}`;
  const [open, setOpen] = useState(() => org.sample && load(key).open);
  useEffect(() => {
    const onChange = () => setOpen(org.sample && load(key).open);
    window.addEventListener('guide-change', onChange);
    return () => window.removeEventListener('guide-change', onChange);
  }, [key, org.sample]);
  return <GuideCtx.Provider value={{ open }}>{children}</GuideCtx.Provider>;
}

export const GUIDE_WIDTH = 380;

export function Guide() {
  const { org, path } = useOrg();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { vt } = theme;
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const key = `guide:${org.id}`;
  const [state, setState] = useState<GuideState>(() => load(key));
  const [problem, setProblem] = useState<string | null>(null);
  const [menuAt, setMenuAt] = useState<HTMLElement | null>(null);
  const save = useCallback((next: Partial<GuideState>) => {
    setState((s) => {
      const merged = { ...s, ...next };
      try { localStorage.setItem(key, JSON.stringify(merged)); } catch { /* fine without it */ }
      window.dispatchEvent(new Event('guide-change'));
      return merged;
    });
  }, [key]);

  const helpers = useMemo<Helpers>(() => ({ get: (p) => api(path(p)) }), [path]);
  const go = useCallback(async (index: number) => {
    const s = STOPS[index];
    const to = typeof s.path === 'string' ? s.path : await s.path(helpers).catch(() => 'today');
    save({ stop: index, open: true, seen: Array.from(new Set([...state.seen, s.group])) });
    setProblem(null);
    navigate(`/o/${org.id}/${to}`);
  }, [helpers, navigate, org.id, save, state.seen]);

  // Explore mode: the first time a section opens, show its introduction.
  const segment = location.pathname.split(`/o/${org.id}/`)[1]?.split('/')[0] ?? 'today';
  useEffect(() => {
    if (!org.sample || state.mode !== 'explore') return;
    const group = ROUTE_GROUP[segment];
    if (!group || state.seen.includes(group)) return;
    const index = STOPS.findIndex((s) => s.group === group);
    if (index >= 0) save({ stop: index, open: true, seen: [...state.seen, group] });
  }, [segment, org.sample, state.mode, state.seen, save]);

  if (!org.sample) return null;
  const stop = STOPS[Math.min(state.stop, STOPS.length - 1)];
  const sample = sampleKind(org.sampleKind);
  const lime = { bgcolor: vt.lime, color: vt.onLime, '&:hover': { bgcolor: '#B3E12A' } };
  const ghost = { color: vt.onInk, borderColor: vt.onInk2, '&:hover': { borderColor: vt.onInk, bgcolor: 'rgba(255,255,255,0.08)' } };

  async function openVolunteer() {
    try {
      const res = await api<{ link: string }>(path('/demo/volunteer-link'), { body: {} });
      window.open(res.link, '_blank', 'noopener');
    } catch (e) {
      setProblem(errorText(e));
    }
  }

  if (!state.open) {
    return (
      <Button
        variant="contained" startIcon={<HelpIcon />} onClick={() => save({ open: true })}
        sx={{ position: 'fixed', zIndex: 1200, bgcolor: vt.ink, color: vt.lime, '&:hover': { bgcolor: vt.ink }, boxShadow: vt.shadowPop, ...(wide ? { right: 24, bottom: 24 } : { right: 12, bottom: 76 }) }}
      >
        Guide
      </Button>
    );
  }

  const groupStart = STOPS.findIndex((s) => s.group === stop.group);
  const groupCount = STOPS.filter((s) => s.group === stop.group).length;
  const position = `${state.stop - groupStart + 1} of ${groupCount}`;

  return (
    <Box role="complementary" aria-label="Demo guide" sx={{
      position: 'fixed', zIndex: 1200, bgcolor: vt.ink, color: vt.onInk, display: 'flex', flexDirection: 'column',
      ...(wide
        ? { top: 0, right: 0, bottom: 0, width: GUIDE_WIDTH, borderLeft: `1px solid ${vt.borderStrong}` }
        : { left: 0, right: 0, bottom: 64, maxHeight: '52vh', borderRadius: '20px 20px 0 0', boxShadow: vt.shadowPop }),
    }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2, pt: 1.5, pb: 1 }}>
        <Typography variant="caption" sx={{ color: vt.lime, fontWeight: 600, flex: 1 }} noWrap>Demo · {sample?.name ?? org.name}</Typography>
        <ToggleButtonGroup exclusive size="small" value={state.mode} onChange={(_, v) => v && save({ mode: v })} aria-label="Guide mode"
          sx={{ '& .MuiToggleButton-root': { color: vt.onInk2, borderColor: vt.borderStrong, py: 0.25, px: 1.25, fontSize: '0.75rem', '&.Mui-selected': { bgcolor: vt.lime, color: vt.onLime } } }}>
          <ToggleButton value="guided">Guided</ToggleButton>
          <ToggleButton value="explore">Explore</ToggleButton>
        </ToggleButtonGroup>
        <IconButton size="small" aria-label="All stops" onClick={(e) => setMenuAt(e.currentTarget)} sx={{ color: vt.onInk2 }}><ListIcon fontSize="small" /></IconButton>
        <IconButton size="small" aria-label="Hide guide" onClick={() => save({ open: false })} sx={{ color: vt.onInk2 }}><CloseIcon fontSize="small" /></IconButton>
      </Stack>
      <Menu open={!!menuAt} anchorEl={menuAt} onClose={() => setMenuAt(null)} slotProps={{ paper: { sx: { maxHeight: 420 } } }}>
        {STOPS.map((s, i) => [
          i === STOPS.findIndex((x) => x.group === s.group) && <ListSubheader key={`h-${s.group}`} disableSticky>{GROUP_NAME[s.group]}</ListSubheader>,
          <MenuItem key={i} selected={i === state.stop} onClick={() => { setMenuAt(null); go(i); }}>{s.title}</MenuItem>,
        ])}
      </Menu>
      <Divider sx={{ borderColor: vt.borderStrong }} />
      <Box sx={{ px: 2.5, py: 2, overflowY: 'auto', flex: 1 }}>
        <Typography variant="caption" component="p" sx={{ color: vt.onInk2 }}>{GROUP_NAME[stop.group]}{groupCount > 1 ? ` · ${position}` : ''}</Typography>
        <Typography component="h2" sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '1.375rem', letterSpacing: '-0.015em', lineHeight: 1.15, mt: 0.25, mb: 1.25 }}>{stop.title}</Typography>
        <Typography variant="body2" sx={{ color: vt.onInk }}>{stop.body}</Typography>
        {stop.tryIt && <Typography variant="body2" sx={{ color: vt.onInk, mt: 1.25 }}><Box component="span" sx={{ color: vt.lime, fontWeight: 600 }}>Try it: </Box>{stop.tryIt}</Typography>}
        {stop.ask && <Typography variant="body2" sx={{ color: vt.onInk2, mt: 1.25, fontStyle: 'italic' }}>{stop.ask}</Typography>}
        {problem && <Typography variant="body2" sx={{ color: vt.tangerine, mt: 1.25 }}>{problem}</Typography>}
        {stop.action === 'volunteer' && <Button size="small" variant="outlined" onClick={openVolunteer} sx={{ ...ghost, mt: 2 }}>Open volunteer page</Button>}
        {stop.action === 'feedback' && (
          <Stack spacing={1} sx={{ mt: 2, alignItems: 'flex-start' }}>
            <Button size="small" variant="contained" href="mailto:hello@vloora.com?subject=Volley%20demo" sx={lime}>Email hello@vloora.com</Button>
            <Button size="small" variant="outlined" onClick={() => navigate('/start?demo=1')} sx={ghost}>Switch sample organization</Button>
          </Stack>
        )}
      </Box>
      <Divider sx={{ borderColor: vt.borderStrong }} />
      <Stack direction="row" spacing={1} sx={{ px: 2, py: 1.5, alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: vt.onInk2, flex: 1 }}>{state.stop + 1} of {STOPS.length}</Typography>
        <Button size="small" disabled={state.stop === 0} onClick={() => go(state.stop - 1)} sx={{ color: vt.onInk2 }}>Back</Button>
        {state.stop < STOPS.length - 1
          ? <Button size="small" variant="contained" onClick={() => go(state.stop + 1)} sx={lime}>Next</Button>
          : <Button size="small" variant="contained" onClick={() => save({ open: false })} sx={lime}>Done</Button>}
      </Stack>
    </Box>
  );
}
