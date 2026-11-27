import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Collapse, Divider, IconButton, LinearProgress, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DoneIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ListIcon from '@mui/icons-material/FormatListBulletedOutlined';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { peopleWords } from './membership';
import { Help } from './common';
import { Mascot } from '../Mascot';
import { FONT_DISPLAY } from '../theme';
import { SKIPPABLE, type SetupStep } from '../../shared/setup';

// The setup guide (docs/specs/setup-guide.md). After an organization is
// created, this helper stays with the person from screen to screen, in the
// same place the demo guide sits: beside the page on a wide screen, a sheet
// above the tabs on a phone. It shows one step at a time. When the person is
// on the screen a step needs, it says what to do there. Steps finish on their
// own from the organization's data.

interface StepText {
  title: string;
  /** What the step is for, shown before the person goes there. */
  help: string;
  button: string;
  to: string;
  second?: { button: string; to: string };
  /** What to do, shown once the person is on the step's screen. */
  here: { on: RegExp; help: string }[];
}

function stepText(key: SetupStep, people: string, tool: string | null): StepText {
  switch (key) {
    case 'org':
      return { title: 'Create your organization', help: '', button: '', to: '', here: [] };
    case 'admin':
      return {
        title: 'Add another admin',
        help: 'Admins can change settings. Add one more, so you are never the only one who can.',
        button: 'Add admin',
        to: 'settings/admins',
        here: [{ on: /^settings\/admins/, help: 'Enter their email, keep Admin selected, then choose Add admin. They sign in with that email.' }],
      };
    case 'people':
      return {
        title: `Bring in your ${people}`,
        help: tool === 'A spreadsheet'
          ? 'Upload your spreadsheet. We match the columns, and you check them before anything saves.'
          : tool?.startsWith('Paid software')
            ? 'Export your list from your current tool as CSV or Excel, then upload it here.'
            : 'Upload a list if you have one, or add people one at a time.',
        button: 'Import a list',
        to: 'import',
        second: { button: 'Add one person', to: 'people?add=1' },
        here: [
          { on: /^import/, help: 'Follow the three steps on this page. Nothing saves until you choose Import.' },
          { on: /^people/, help: 'Give a name, and an email or phone so they can be asked.' },
        ],
      };
    case 'details':
      return {
        title: `Check what you track about ${people}`,
        help: 'Each person has fields such as skills and availability. You use them to decide who to ask.',
        button: 'Review custom fields',
        to: 'settings/fields',
        here: [{ on: /^settings\/fields/, help: 'Add a field at the bottom, or remove one you will not use. Changes save as you go.' }],
      };
    case 'task':
      return {
        title: 'Create your first task',
        help: 'A task is one piece of work: a shift, an errand, a job to hand off.',
        button: 'New task',
        to: 'tasks/new',
        here: [{ on: /^tasks\/new/, help: 'Give it a title and a time, then choose Publish. Everything else is optional.' }],
      };
    case 'ask':
      return {
        title: 'Ask people to help',
        help: 'Open your task and choose Ask. People answer from a link, with no account.',
        button: 'Open tasks',
        to: 'tasks',
        here: [
          { on: /^tasks\/[^/]+$/, help: 'Choose Ask to see who fits, then send. Each person gets their own link.' },
          { on: /^tasks$/, help: 'Open the task you made.' },
        ],
      };
  }
}

export const SETUP_WIDTH = 360;

/** Whether the guide is taking up room beside or below the page. */
export function useSetupOpen(): boolean {
  const { org, setup, me } = useOrg();
  return !org.sample && me.role !== 'lead' && !setup.hidden;
}

export function SetupGuide() {
  const { org, setup, path, reload, me } = useOrg();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { vt } = theme;
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const [picked, setPicked] = useState<SetupStep | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const active = !org.sample && me.role !== 'lead';

  // Steps finish from the organization's data, so look again after each move.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (active && !setup.finished) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  // A picked step lets go once it is done.
  useEffect(() => {
    if (picked && setup.steps.find((s) => s.key === picked)?.done) setPicked(null);
  }, [picked, setup.steps]);

  if (!active || (setup.finished && setup.hidden)) return null;
  const words = peopleWords(org.peopleWord);
  const patch = (body: unknown) => api(path('/setup'), { method: 'PATCH', body }).then(reload);
  const go = (to: string) => navigate(`/o/${org.id}/${to}`);
  const lime = { bgcolor: vt.lime, color: vt.onLime, '&:hover': { bgcolor: '#B3E12A' } };
  const ghost = { color: vt.onInk, borderColor: vt.onInk2, '&:hover': { borderColor: vt.onInk, bgcolor: 'rgba(255,255,255,0.08)' } };
  const quiet = { color: vt.onInk2 };

  // Put away: a small button that brings the guide back.
  if (setup.hidden) {
    return (
      <Button onClick={() => patch({ hidden: false })} aria-label={`Setup guide, ${setup.done} of ${setup.total} done`}
        sx={{ position: 'fixed', zIndex: 1200, bgcolor: vt.ink, color: vt.lime, '&:hover': { bgcolor: vt.ink }, boxShadow: vt.shadowPop, pl: 0.5, pr: 1.75, gap: 1, borderRadius: 999,
          ...(wide ? { right: 24, bottom: 24 } : { left: 12, bottom: 76 }) }}>
        <Mascot size={34} />Setup · {setup.done} of {setup.total}
      </Button>
    );
  }

  const where = location.pathname.split(`/o/${org.id}/`)[1] ?? 'today';
  const key = picked ?? setup.next;
  const state = setup.steps.find((s) => s.key === key);
  const text = key ? stepText(key, words.people, setup.currentTool) : null;
  const here = text?.here.find((h) => h.on.test(where));
  const number = key ? setup.steps.findIndex((s) => s.key === key) + 1 : setup.total;
  const strip = !wide && !!here && !setup.finished;

  const frame = {
    position: 'fixed', zIndex: 1200, bgcolor: vt.ink, color: vt.onInk, display: 'flex', flexDirection: 'column',
    ...(wide
      ? { top: 0, right: 0, bottom: 0, width: SETUP_WIDTH, borderLeft: `1px solid ${vt.borderStrong}` }
      : { left: 0, right: 0, bottom: 64, maxHeight: '56vh', borderRadius: '20px 20px 0 0', boxShadow: vt.shadowPop }),
  } as const;

  const steps = (
    <Stack component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {setup.steps.map((s, i) => {
        const t = stepText(s.key, words.people, setup.currentTool);
        const current = s.key === key;
        return (
          <Box component="li" key={s.key}>
            <Button fullWidth disabled={s.done} onClick={() => { setPicked(s.key); setListOpen(false); }} aria-current={current ? 'step' : undefined}
              sx={{ justifyContent: 'flex-start', gap: 1.25, px: 1, py: 0.75, borderRadius: 2, textAlign: 'left', color: current ? vt.onInk : vt.onInk2, fontWeight: current ? 700 : 500, '&.Mui-disabled': { color: vt.onInk2 } }}>
              {s.done
                ? <DoneIcon sx={{ color: vt.lime, fontSize: 22 }} titleAccess="Done" />
                : <Box aria-hidden sx={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '0.75rem', fontWeight: 700,
                    border: `1.5px solid ${current ? vt.lime : vt.onInk2}`, color: current ? vt.lime : vt.onInk2 }}>{i + 1}</Box>}
              <Box component="span" sx={{ flex: 1, textDecoration: s.done ? 'line-through' : 'none' }}>{t.title}</Box>
              {s.skipped && <Box component="span" sx={{ fontSize: '0.8125rem' }}>Skipped</Box>}
            </Button>
          </Box>
        );
      })}
    </Stack>
  );

  return (
    <Box component="section" role="complementary" aria-label="Setup guide" sx={frame}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', px: 2, pt: 1.5, pb: 1 }}>
        <Mascot size={wide ? 44 : 36} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" component="p" noWrap sx={{ color: vt.lime, fontWeight: 600 }}>{strip ? text!.title : 'Setup guide'}</Typography>
          <Typography variant="caption" component="p" sx={{ color: vt.onInk2 }}>{setup.finished ? 'All done' : `Step ${number} of ${setup.total}`}</Typography>
        </Box>
        {!wide && !setup.finished && <IconButton size="small" aria-label="All steps" aria-expanded={listOpen} onClick={() => setListOpen(!listOpen)} sx={quiet}><ListIcon fontSize="small" /></IconButton>}
        <IconButton size="small" aria-label="Hide setup guide" onClick={() => patch({ hidden: true })} sx={quiet}><CloseIcon fontSize="small" /></IconButton>
      </Stack>
      <LinearProgress variant="determinate" value={(setup.done / setup.total) * 100} aria-label="Setup progress"
        sx={{ height: 4, bgcolor: vt.borderStrong, '& .MuiLinearProgress-bar': { bgcolor: vt.lime } }} />

      <Box sx={{ px: 2.5, py: strip ? 1.25 : 2, overflowY: 'auto', flex: wide ? 1 : undefined }}>
        {setup.finished || !text ? (
          <>
            <Typography component="h2" sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '1.375rem', lineHeight: 1.15, mb: 1 }}>Setup is done</Typography>
            <Help sx={{ color: vt.onInk }}>Today lists what needs you next. Everything you set up can be changed in Settings.</Help>
            <Button variant="contained" onClick={() => patch({ hidden: true })} sx={{ ...lime, mt: 2 }}>Done</Button>
          </>
        ) : (
          <>
            {!strip && <Typography component="h2" sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: wide ? '1.375rem' : '1.1875rem', letterSpacing: '-0.015em', lineHeight: 1.15, mb: 0.75 }}>{text.title}</Typography>}
            <Help sx={{ color: vt.onInk }}>{here ? here.help : text.help}</Help>
            {key === 'ask' && !org.approved && !here && <Help sx={{ color: vt.onInk2, mt: 0.75 }}>Email is off until we approve your organization. Until then, you copy each link.</Help>}
            <Stack direction="row" spacing={1} useFlexGap sx={{ mt: strip ? 1 : 1.75, flexWrap: 'wrap', '&:empty': { display: 'none' } }}>
              {!here && <Button variant="contained" onClick={() => go(text.to)} sx={lime}>{text.button}</Button>}
              {!here && text.second && <Button variant="outlined" onClick={() => go(text.second!.to)} sx={ghost}>{text.second.button}</Button>}
              {key === 'details' && here && <Button variant="contained" onClick={() => patch({ seen: 'details' }).then(() => go('today'))} sx={lime}>Done</Button>}
              {key && SKIPPABLE.includes(key) && !state?.skipped && <Button onClick={() => { setPicked(null); patch({ skip: key }); }} sx={quiet}>Skip</Button>}
            </Stack>
          </>
        )}
        {!setup.finished && (wide
          ? <><Divider sx={{ borderColor: vt.borderStrong, my: 2.5 }} />{steps}</>
          : <Collapse in={listOpen} unmountOnExit><Divider sx={{ borderColor: vt.borderStrong, my: 1.5 }} />{steps}</Collapse>)}
      </Box>
    </Box>
  );
}
