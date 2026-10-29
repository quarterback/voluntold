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
    body: "You're in a sample organization. Everything in it is made up, and everything you do stays in your copy. This guide explains each feature as you reach it. Guided takes you through every stop in order. Explore lets you go anywhere, and the guide introduces each section the first time you open it.",
    tryIt: 'Switch between Guided and Explore at the top of this panel any time.',
    ask: "As you go, note what's missing for your organization and what's more than you'd want.",
  },
  {
    group: 'today', path: 'today', title: 'The to-do list',
    body: 'Today lists the decisions waiting for a coordinator: first offers ready for people never asked, needs with work to offer or gaps, tasks whose next batch is due, problem reports from volunteers and people paused after unanswered asks. Each line opens the screen where the decision is made.',
    tryIt: 'Tap a line. The guide follows you.',
    ask: "Is this the list you'd start your day with? What's on yours that isn't here?",
  },
  {
    group: 'today', path: 'today', title: 'This week and capacity',
    body: "This week shows the work coming up and how many spots are filled. Capacity shows how many approved people you have, how many were never asked, how long it takes a new person to get a first ask and who has said yes twice. Volley doesn't rank people by how fast they answer or chase anyone.",
    ask: 'Which of these numbers would you look at? Which would you ignore?',
  },
  {
    group: 'needs', path: 'needs', title: 'Needs',
    body: "A need is something the organization wants to run, such as a Saturday delivery or a pledge drive. It holds the assignments it takes, which are ordinary tasks, and the supplies and information it can't start without. The list shows how many assignments have someone who fits and how many have a gap.",
    tryIt: 'Open a need to see its assignments and supplies.',
    ask: 'What do you run that starts as a plan before it becomes tasks?',
  },
  {
    group: 'needs', path: firstNeed, title: 'Assignments, supplies and Offer',
    body: 'Each assignment shows the person who fits and has waited longest, or a gap when no one fits. Supplies and information are listed with what is still needed. Offer publishes the assignments that have people and asks each one its first batch. Nothing goes out until a coordinator taps it.',
    tryIt: 'Mark a supply covered, or tap Offer on an active need.',
    ask: 'Before you ask anyone, what else has to be in place?',
  },
  {
    group: 'tasks', path: 'tasks', title: 'The task list',
    body: 'Every task is a draft, open, filled, canceled or done. The list shows when each one happens, how many spots are filled and how many answers are pending. Work is done when its time passes, with no timesheet and no confirmation step.',
    tryIt: 'Open an open task.',
    ask: 'How do you keep track of what\'s filled today, and where does it live?',
  },
  {
    group: 'tasks', path: 'tasks/new', title: 'Writing a task',
    body: 'A task has a title, what to do, when, a place with a public part and a private address, how many people, who to find, what to bring and files. It can be remote, and short work carries an effort in minutes so it fits people with little time.',
    tryIt: 'Fill in a task. Save it as a draft or publish it.',
    ask: 'What does one of your tasks need that this form doesn\'t ask for?',
  },
  {
    group: 'tasks', path: 'tasks/new', title: 'Requirements',
    body: "Requirements are written against your organization's own fields: a skill, an experience level, a cleared background check, a certification or a team. Only people who meet every requirement are asked. There's no general pool.",
    tryIt: 'Add a requirement and pick a field.',
    ask: 'What decides who you can ask for a task? Is it written down anywhere?',
  },
  {
    group: 'tasks', path: 'tasks/new', title: 'Three ways to ask',
    body: 'In batches asks the people who fit and have waited longest, a few at a time, and tells you when the next batch is due. All eligible asks everyone who fits at once, and the first to accept get the spots. Manual lets you pick names. Each organization also sets a weekly limit on asks per person.',
    tryIt: 'Change the method under Asks and watch the batch fields appear.',
    ask: 'How do you decide who to ask, and who gets asked too often?',
  },
  {
    group: 'tasks', path: firstOpenTask, title: 'Batches and the next group',
    body: 'A task page shows each batch that went out and how it went: accepted, declined, expired or pending. When a batch has run its course and spots are still open, Today says to ask the next group. The person who has waited longest goes first.',
    tryIt: 'Tap Ask to see the next group and who it is.',
    ask: 'When a task isn\'t filling, what do you do today?',
  },
  {
    group: 'tasks', path: firstOpenTask, title: 'Private links',
    body: "Each person asked gets a private link. Volley doesn't send it. The coordinator copies the links into the email, text or chat the organization already uses. A link can be reset if it's lost, and it expires before the task starts.",
    tryIt: 'Ask the next group, then Copy all.',
    ask: 'How do your asks go out now, and what would you want sent for you?',
  },
  {
    group: 'tasks', path: firstOpenTask, title: 'Who fits and who doesn\'t',
    body: "When you ask, the dialog lists who fits in order of longest wait, and who can't be asked and why: a missing requirement, the weekly limit, a schedule conflict, a pause or no consent. The reasons are the rules the organization set.",
    tryIt: 'Open Ask and read the Not eligible list.',
    ask: 'Which of these reasons match how you work? Which would you drop?',
  },
  {
    group: 'tasks', path: firstOpenTask, title: 'Spots, no-shows and problems',
    body: "An accepted ask holds a spot. When the task's time passes, the spot is attended unless the coordinator marks a no-show afterward. A volunteer can cancel a spot, which reopens it, or report a problem, which shows on Today.",
    tryIt: 'Find a spot and mark it, then undo it.',
    ask: 'What happens today when someone says yes and doesn\'t come?',
  },
  {
    group: 'people', path: 'people', title: 'Everyone you have',
    body: "People are records with the fields your organization chooses, plus tags, a tier, availability and a line that says where they stand: never asked, asked three weeks ago and accepted, paused. The list sorts by who has waited longest, so the people at the top are the ones to ask next.",
    tryIt: 'Scroll the list and read a few rows.',
    ask: 'How close is this to what you know about your people?',
  },
  {
    group: 'people', path: 'people', title: 'Tags, tiers and availability',
    body: 'Tags group people at a glance. Volley proposes them from what people can do, marks new ones until a coordinator looks and lets two be merged. Tiers say how often someone volunteers: one time, seasonal, regular or core. Availability is hours a week, usual times and whether remote work is fine. Work outside someone\'s time doesn\'t fit them.',
    tryIt: 'Tap a tag or a tier to filter.',
    ask: 'What would you group your people by? Do you know their hours?',
  },
  {
    group: 'people', path: 'people', title: 'Filters and saved lists',
    body: 'Any field, tag, tier, team or status can be a filter, and a filter can be saved as a list, such as Spanish speakers who can lead. Lists update themselves as people change.',
    tryIt: 'Open Filters, pick a field and Save list.',
    ask: 'Which lists do you keep by hand today?',
  },
  {
    group: 'people', path: firstPerson, title: 'A person\'s record',
    body: 'A person\'s page holds their details, teams, availability and history: every ask, every answer and every spot. A coordinator can pause asks until a date, resume them or stop them. A person can do the same from their own page.',
    tryIt: 'Change a field and save, or pause asks.',
    ask: 'What do you keep about a person that isn\'t here?',
  },
  {
    group: 'offers', path: 'offers', title: 'First offers',
    body: 'For each approved person who was never asked, Volley proposes the open work that fits them: remote first, then work that uses a skill they have, then the shortest. A coordinator approves each offer or skips it. Nothing goes out on its own.',
    tryIt: 'Approve one offer and skip another.',
    ask: 'How long does a new volunteer wait before you ask them for anything?',
  },
  {
    group: 'volunteers', path: firstOpenTask, title: 'What volunteers see',
    body: "Volunteers never sign in. Their link opens a page with the task, the time, the place, who to find, what to bring and two buttons. Below it, the work they've accepted, with Cancel spot and Report a problem, open work they fit and can accept directly, and their own availability. Nothing about other volunteers is shown.",
    tryIt: 'Open the volunteer page for someone with a pending ask.',
    ask: "Is there anything here you wouldn't want a volunteer to see, or anything missing that they'd need?",
    action: 'volunteer',
  },
  {
    group: 'import', path: 'import', title: 'Import',
    body: "A coordinator can bring in a list from a CSV, Excel, XML or JSON file, or a text, Word or PDF file through a model. Volley suggests which column goes to which field, shows likely duplicates side by side and sets aside rows with no email or phone, because nobody can send them a link. This sample has one import on record. You don't need to import anything to try the rest.",
    ask: 'Where does your list live now, and what shape is it in?',
  },
  {
    group: 'settings', path: 'settings', title: 'Fields and teams',
    body: "Fields are the details your organization tracks about volunteers: the four starters, and anything you add, such as a certification or a background check. Requirements and filters are written against them. Teams are groups with leads who decide who's on them, and a task can require a team.",
    tryIt: 'Add a field or a choice. It appears on every person\'s record.',
    ask: 'What fields would you add on day one?',
  },
  {
    group: 'settings', path: 'settings', title: 'Members, limits, posting and export',
    body: "Members run the tool: admins, coordinators and team leads. The weekly ask limit caps how often one person can be asked. An organization can connect its Bluesky account and post public tasks there, never people. Export downloads everything as CSV and JSON.",
    ask: 'Who at your organization would use this, and what would they need to take with them if they left?',
  },
  {
    group: 'end', path: 'today', title: 'Yours to play with',
    body: "That's every feature. The sample is yours now: publish tasks, ask people, answer as a volunteer, import a file, change settings. Switch to another sample organization from the name at the top left. When you're done, tell us what fit and what didn't. We'd like to do a walkthrough with you.",
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
