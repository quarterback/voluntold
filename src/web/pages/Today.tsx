import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Divider, Fab, ListItemButton, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ChevronIcon from '@mui/icons-material/ChevronRight';
import SendIcon from '@mui/icons-material/SendOutlined';
import FlagIcon from '@mui/icons-material/FlagOutlined';
import CarIcon from '@mui/icons-material/LocalShippingOutlined';
import PauseIcon from '@mui/icons-material/PauseCircleOutlined';
import BlockIcon from '@mui/icons-material/PersonOffOutlined';
import DraftIcon from '@mui/icons-material/EditNoteOutlined';
import ReportIcon from '@mui/icons-material/ReportGmailerrorredOutlined';
import ImportIcon from '@mui/icons-material/UploadFileOutlined';
import CloudIcon from '@mui/icons-material/CloudOffOutlined';
import BoltIcon from '@mui/icons-material/Bolt';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { IconTile, Loading, Page, StatTile, useLoad, type Tone } from './common';
import { day, time, timeRange } from '../../shared/time';

interface Item {
  kind: string;
  [key: string]: any;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const first = (name: string) => name.split(/\s+/)[0];

function whenOf(i: Item, tz: string): string {
  if (i.timing === 'at_time' && i.startsAt) return `${day(i.startsAt, tz)}, ${timeRange(i.startsAt, i.endsAt, tz)}`;
  if (i.timing === 'by_date' && i.dueAt) return `Due ${day(i.dueAt, tz)}`;
  return '';
}

function describe(i: Item, tz: string): { icon: ReactNode; tone: Tone; title: string; body: string; to: string } | null {
  switch (i.kind) {
    case 'first_offers':
      return {
        icon: <SendIcon />, tone: 'accent', title: `${plural(i.count, 'first offer')} ready`,
        body: `${i.names.map(first).join(', ')}${i.count > i.names.length ? ' and more' : ''} · never asked`, to: 'offers',
      };
    case 'need':
      return {
        icon: <FlagIcon />, tone: 'info', title: i.title,
        body: [`${i.canOffer} of ${plural(i.assignments, 'assignment')} ready`, i.gaps ? plural(i.gaps, 'gap') : ''].filter(Boolean).join(' · '),
        to: `needs/${i.needId}`,
      };
    case 'ask_next':
      return {
        icon: <CarIcon />, tone: 'warning', title: i.title,
        body: [whenOf(i, tz), `${i.holding} of ${i.peopleNeeded}`, i.nextAt ? `batch ${i.nextBatch} at ${time(i.nextAt, tz)}` : `batch ${i.nextBatch} ready`].filter(Boolean).join(' · '),
        to: `tasks/${i.taskId}`,
      };
    case 'no_one_left':
      return { icon: <BlockIcon />, tone: 'danger', title: i.title, body: [whenOf(i, tz), `${i.holding} of ${i.peopleNeeded}`, 'no eligible people'].filter(Boolean).join(' · '), to: `tasks/${i.taskId}` };
    case 'report':
      return { icon: <ReportIcon />, tone: 'danger', title: `${first(i.name)}: ${i.title}`, body: i.body, to: `tasks/${i.taskId}` };
    case 'paused_person':
      return { icon: <PauseIcon />, tone: 'neutral', title: `${i.name} paused`, body: '3 unanswered asks', to: `people/${i.volunteerId}` };
    case 'paused_no_answer':
      return { icon: <PauseIcon />, tone: 'neutral', title: `${plural(i.count, 'person', 'people')} paused`, body: '3 unanswered asks', to: 'people?filter=paused' };
    case 'draft':
      return { icon: <DraftIcon />, tone: 'neutral', title: i.title, body: 'Draft', to: `tasks/${i.taskId}` };
    case 'set_aside':
      return { icon: <ImportIcon />, tone: 'neutral', title: `${plural(i.count, 'row')} skipped`, body: i.fileName, to: 'import' };
    case 'atproto_error':
      return { icon: <CloudIcon />, tone: 'danger', title: `Not posted: ${i.title}`, body: i.message ?? '', to: `tasks/${i.taskId}` };
    default:
      return null;
  }
}

const ORDER = ['first_offers', 'need', 'report', 'no_one_left', 'ask_next', 'paused_person', 'paused_no_answer', 'draft', 'set_aside', 'atproto_error'];

export function Today() {
  const { path } = useOrg();
  const navigate = useNavigate();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const { data, error } = useLoad(() => api(path('/today')), [path]);
  if (!data) return <Loading error={error} />;
  const tz = data.timeZone;
  const items = (data.items as Item[])
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
    .map((i) => describe(i, tz))
    .filter(Boolean) as NonNullable<ReturnType<typeof describe>>[];
  const go = (to: string) => navigate(`../${to}`, { relative: 'path' });
  const cap = data.capacity;
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz });

  return (
    <Page title={date} width={880}>
      <Typography variant="h2" component="h2" sx={{ mb: 1 }}>To do</Typography>
      <Card>
        {items.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2.5 }}>Nothing to do</Typography>}
        {items.map((item, i) => (
          <Box key={i}>
            {i > 0 && <Divider />}
            <ListItemButton onClick={() => go(item.to)} sx={{ borderRadius: 0, px: 2, py: 1.5, gap: 1.5, alignItems: 'flex-start' }}>
              <IconTile icon={item.icon} tone={item.tone} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h3" component="h3">{item.title}</Typography>
                {item.body && <Typography variant="body2" color="text.secondary">{item.body}</Typography>}
              </Box>
              <ChevronIcon fontSize="small" sx={{ color: 'text.disabled', alignSelf: 'center' }} />
            </ListItemButton>
          </Box>
        ))}
      </Card>

      {data.thisWeek.length > 0 && (
        <>
          <Typography variant="h2" component="h2" sx={{ mt: 3, mb: 1 }}>This week</Typography>
          <Card>
            {data.thisWeek.map((t: any, i: number) => (
              <Box key={t.id}>
                {i > 0 && <Divider />}
                <ListItemButton onClick={() => go(`tasks/${t.id}`)} sx={{ borderRadius: 0, px: 2, py: 1.25, gap: 1.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h3" component="h3" noWrap>{t.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{day(t.startsAt, tz)}, {timeRange(t.startsAt, t.endsAt, tz)}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: t.holding < t.peopleNeeded ? 'error.main' : 'text.primary' }}>
                    {t.holding} of {t.peopleNeeded}
                  </Typography>
                </ListItemButton>
              </Box>
            ))}
          </Card>
        </>
      )}

      <Stack direction="row" sx={{ mt: 3, mb: 1, justifyContent: 'space-between' }}>
        <Typography variant="h2" component="h2">Capacity</Typography>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, mb: 8 }}>
        <StatTile label="Approved" value={cap.approved} tone="lime" />
        <StatTile label="Never asked" value={cap.never_offered} />
        <StatTile label="Days to first ask" value={cap.daysToFirstOffer ?? 'None'} />
        <StatTile label="Accepted twice" value={cap.yes_twice} tone="blue" />
      </Box>

      <Fab variant="extended" onClick={() => navigate('../tasks/new?urgent=1', { relative: 'path' })}
        sx={(t) => ({ position: 'fixed', right: 16, bottom: wide ? 24 : 76, gap: 0.75, bgcolor: t.vt.tangerine, color: t.vt.onTangerine, '&:hover': { bgcolor: t.vt.tangerine, filter: 'brightness(0.95)' } })}>
        <BoltIcon fontSize="small" />Urgent ask
      </Fab>
    </Page>
  );
}
