import { useNavigate } from 'react-router-dom';
import { Box, Card, Divider, ListItemButton, Stack, Typography } from '@mui/material';
import ChevronIcon from '@mui/icons-material/ChevronRight';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Loading, Page, StatTile, StatusBadge, useLoad, type Tone } from './common';
import { day } from '../../shared/time';

interface Item {
  kind: string;
  taskId?: string;
  title?: string;
  openSpots?: number;
  fits?: number;
  soon?: boolean;
  firstRound?: boolean;
  startsAt?: number;
  count?: number;
  fileName?: string;
  message?: string;
  people?: { id: string; name: string }[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function describe(item: Item): { title: string; body: string; to: string; badge: [string, Tone] } | null {
  switch (item.kind) {
    case 'ask_next':
      return {
        title: item.firstRound ? `Ask people for ${item.title}` : `Ask more people for ${item.title}`,
        body: `${plural(item.openSpots!, 'spot')} open, ${item.fits} fit${item.soon && item.startsAt ? `. Starts ${day(item.startsAt)}` : ''}`,
        to: `tasks/${item.taskId}`,
        badge: item.soon ? ['Soon', 'warning'] : ['Ask', 'accent'],
      };
    case 'no_one_left':
      return { title: `No one left to ask for ${item.title}`, body: `${plural(item.openSpots!, 'spot')} open. Loosen the requirements or add people.`, to: `tasks/${item.taskId}`, badge: ['Stuck', 'danger'] };
    case 'draft':
      return { title: item.title!, body: 'Open it to start asking', to: `tasks/${item.taskId}`, badge: ['Draft', 'neutral'] };
    case 'never_asked':
      return { title: `${plural(item.count!, 'person', 'people')} never asked`, body: 'They agreed to help', to: 'people?filter=never', badge: ['People', 'info'] };
    case 'paused_no_answer':
      return {
        title: `${plural(item.count!, 'person', 'people')} paused after 3 unanswered asks`,
        body: `${item.people!.map((p) => p.name).join(', ')}${item.count! > item.people!.length ? ' and others' : ''}. Any answer unpauses them.`,
        to: 'people?filter=paused',
        badge: ['Paused', 'neutral'],
      };
    case 'set_aside':
      return { title: `${plural(item.count!, 'row')} set aside from ${item.fileName}`, body: 'No name, or no email or phone', to: 'import', badge: ['Import', 'neutral'] };
    case 'atproto_error':
      return { title: `${item.title} isn't posted`, body: item.message ?? '', to: `tasks/${item.taskId}`, badge: ['Not posted', 'danger'] };
    default:
      return null;
  }
}

export function Today() {
  const { path } = useOrg();
  const navigate = useNavigate();
  const { data, error } = useLoad(() => api(path('/today')), [path]);
  if (!data) return <Loading error={error} />;
  const items = (data.items as Item[]).map(describe).filter(Boolean) as NonNullable<ReturnType<typeof describe>>[];
  const m = data.measures;
  return (
    <Page title="Today">
      {m && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" component="p" sx={{ mb: 1 }}>Last 30 days</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            <StatTile label="Volunteers" value={m.people} />
            <StatTile label="Asked" value={m.asked} />
            <StatTile label="Said yes" value={m.said_yes} />
            <StatTile label="Tasks filled" value={m.filled} />
          </Box>
        </Box>
      )}
      <Typography variant="h2" component="h2" sx={{ mb: 1 }}>To do</Typography>
      <Card>
        {items.length === 0 && (
          <Box sx={{ p: 2.5 }}>
            <Typography variant="h3">You're all caught up</Typography>
            <Typography variant="body2" color="text.secondary">Open tasks are full or waiting on answers.</Typography>
          </Box>
        )}
        {items.map((item, i) => (
          <Box key={i}>
            {i > 0 && <Divider />}
            <ListItemButton onClick={() => navigate(`../${item.to}`, { relative: 'path' })} sx={{ borderRadius: 0, px: 2.5, py: 1.5, gap: 1.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="h3" component="h3" noWrap>{item.title}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">{item.body}</Typography>
              </Box>
              <StatusBadge label={item.badge[0]} tone={item.badge[1]} />
              <ChevronIcon fontSize="small" sx={{ color: 'text.disabled' }} />
            </ListItemButton>
          </Box>
        ))}
      </Card>
    </Page>
  );
}
