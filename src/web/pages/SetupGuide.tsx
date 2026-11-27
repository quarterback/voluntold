import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, Collapse, Divider, IconButton, LinearProgress, ListItemButton, Stack, Typography } from '@mui/material';
import DoneIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { peopleWords } from './membership';
import { Help } from './common';
import { SKIPPABLE, type SetupStep } from '../../shared/setup';

// The setup guide (docs/specs/setup-guide.md). A new organization sees it at
// the top of Today until every step is done or skipped, or until someone hides
// it. Steps finish on their own from the organization's data. Settings keeps a
// way back to it.

interface StepText {
  title: string;
  help: string;
  button: string;
  to: string;
  second?: { button: string; to: string };
}

function stepText(key: SetupStep, people: string, tool: string | null): StepText {
  switch (key) {
    case 'org':
      return { title: 'Create your organization', help: '', button: '', to: '' };
    case 'details':
      return {
        title: `Choose what to track about ${people}`,
        help: 'Skills, experience, availability. You use these to decide who to ask.',
        button: 'Review custom fields',
        to: 'settings/fields',
      };
    case 'people':
      return {
        title: `Add your ${people}`,
        help: tool === 'A spreadsheet'
          ? 'Upload your spreadsheet. We match the columns, and you check them.'
          : tool?.startsWith('Paid software')
            ? 'Export your list from your current tool as CSV or Excel, then upload it.'
            : 'Upload a list, or add people one at a time.',
        button: 'Import a list',
        to: 'import',
        second: { button: 'Add one person', to: 'people?add=1' },
      };
    case 'task':
      return {
        title: 'Create your first task',
        help: 'A task is one piece of work: a shift, an errand, a job to hand off.',
        button: 'New task',
        to: 'tasks/new',
      };
    case 'ask':
      return {
        title: 'Ask people to help',
        help: 'Open a task and choose Ask. People answer from a link, with no account.',
        button: 'Open tasks',
        to: 'tasks',
      };
    case 'admin':
      return {
        title: 'Add another admin',
        help: 'A second admin keeps things moving when you are away.',
        button: 'Add admin',
        to: 'settings/admins',
      };
  }
}

export function SetupGuide() {
  const { org, setup, path, reload, me } = useOrg();
  const navigate = useNavigate();
  const [open, setOpen] = useState<SetupStep | null>(null);
  if (org.sample || me.role === 'lead' || setup.hidden || setup.finished) return null;
  const words = peopleWords(org.peopleWord);
  const current = open ?? setup.next;
  const patch = (body: unknown) => api(path('/setup'), { method: 'PATCH', body }).then(reload);
  const go = (to: string) => navigate(`/o/${org.id}/${to}`);

  return (
    <Card component="section" aria-label="Setup guide" sx={(t) => ({ mb: 3, border: `2px solid ${t.vt.ink}` })}>
      <Stack direction="row" sx={{ alignItems: 'flex-start', px: 2.5, pt: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h2" component="h2">Get started</Typography>
          <Typography variant="body2" color="text.secondary">{setup.done} of {setup.total} done</Typography>
        </Box>
        <IconButton size="small" aria-label="Hide setup guide" onClick={() => patch({ hidden: true })}><CloseIcon fontSize="small" /></IconButton>
      </Stack>
      <Box sx={{ px: 2.5, pt: 1, pb: 1.5 }}>
        <LinearProgress variant="determinate" value={(setup.done / setup.total) * 100} aria-label="Setup progress" sx={{ height: 8, borderRadius: 4 }} />
      </Box>
      {setup.steps.map((s, i) => {
        const text = stepText(s.key, words.people, setup.currentTool);
        const expanded = !s.done && current === s.key;
        return (
          <Box key={s.key}>
            <Divider />
            <ListItemButton disabled={s.done} aria-expanded={s.done ? undefined : expanded} onClick={() => setOpen(s.key)}
              sx={{ borderRadius: 0, px: 2.5, py: 1.25, gap: 1.5, '&.Mui-disabled': { opacity: 1 } }}>
              {s.done
                ? <DoneIcon sx={(t) => ({ color: t.vt.success, fontSize: 26 })} titleAccess="Done" />
                : <Box aria-hidden sx={(t) => ({ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '0.8125rem', fontWeight: 700,
                    border: `1.5px solid ${expanded ? t.vt.ink : t.vt.border}`, bgcolor: expanded ? t.vt.ink : 'transparent', color: expanded ? t.vt.onInk : t.vt.text2 })}>{i + 1}</Box>}
              <Typography sx={{ flex: 1, fontWeight: 600, color: s.done ? 'text.secondary' : 'text.primary', textDecoration: s.done ? 'line-through' : 'none' }}>{text.title}</Typography>
              {s.skipped && <Typography variant="body2" color="text.secondary">Skipped</Typography>}
            </ListItemButton>
            <Collapse in={expanded} unmountOnExit>
              <Box sx={{ pl: 8, pr: 2.5, pb: 2 }}>
                <Help>{text.help}</Help>
                <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                  <Button variant="contained" onClick={() => go(text.to)}>{text.button}</Button>
                  {text.second && <Button variant="outlined" onClick={() => go(text.second!.to)}>{text.second.button}</Button>}
                  {SKIPPABLE.includes(s.key) && !s.skipped && <Button onClick={() => { setOpen(null); patch({ skip: s.key }); }}>Skip</Button>}
                </Stack>
              </Box>
            </Collapse>
          </Box>
        );
      })}
      {!org.approved && (
        <>
          <Divider />
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Help>We review each new organization before it can send email. You can set everything up now and copy links until then.</Help>
          </Box>
        </>
      )}
    </Card>
  );
}
