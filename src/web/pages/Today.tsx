import { useNavigate } from 'react-router-dom';
import { Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Loading, Page, useLoad } from './common';
import { when } from '../format';

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

function describe(item: Item): { title: string; body: string; to: string } | null {
  switch (item.kind) {
    case 'ask_next':
      return {
        title: item.firstRound ? `Ask people: ${item.title}` : `Ask more people: ${item.title}`,
        body: `${plural(item.openSpots!, 'spot')} open, ${item.fits} fit${item.soon && item.startsAt ? `. Starts ${when({ timing: 'at_time', startsAt: item.startsAt, endsAt: item.startsAt, dueAt: null }).split(',')[0]}` : ''}.`,
        to: `tasks/${item.taskId}`,
      };
    case 'no_one_left':
      return {
        title: `No one left to ask: ${item.title}`,
        body: `${plural(item.openSpots!, 'spot')} open. Loosen the requirements or add people.`,
        to: `tasks/${item.taskId}`,
      };
    case 'draft':
      return { title: `Draft: ${item.title}`, body: 'Open it to start asking.', to: `tasks/${item.taskId}` };
    case 'never_asked':
      return { title: `${plural(item.count!, 'person', 'people')} never asked`, body: 'They agreed to help.', to: 'people?filter=never' };
    case 'paused_no_answer':
      return {
        title: `${plural(item.count!, 'person', 'people')} paused: no answer to 3 asks`,
        body: `${item.people!.map((p) => p.name).join(', ')}${item.count! > item.people!.length ? ' and others' : ''}. Any answer unpauses them.`,
        to: 'people?filter=paused',
      };
    case 'set_aside':
      return { title: `${plural(item.count!, 'row')} set aside from ${item.fileName}`, body: 'No name, or no email or phone.', to: 'import' };
    case 'atproto_error':
      return { title: `Not posted: ${item.title}`, body: item.message ?? '', to: `tasks/${item.taskId}` };
    default:
      return null;
  }
}

export function Today() {
  const { path } = useOrg();
  const navigate = useNavigate();
  const { data, error } = useLoad(() => api(path('/today')), [path]);
  if (!data) return <Loading error={error} />;
  const items = (data.items as Item[]).map(describe).filter(Boolean) as ReturnType<typeof describe>[];
  const m = data.measures;
  return (
    <Page title="Today">
      <Stack spacing={1}>
        {items.length === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h3">Nothing to do</Typography>
              <Typography variant="body2" color="text.secondary">Open tasks are full or waiting on answers.</Typography>
            </CardContent>
          </Card>
        )}
        {items.map((item, i) => (
          <Card key={i}>
            <CardActionArea onClick={() => navigate(`../${item!.to}`, { relative: 'path' })}>
              <CardContent>
                <Typography variant="h3" component="h2">{item!.title}</Typography>
                <Typography variant="body2" color="text.secondary">{item!.body}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
      {m && m.people > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Last 30 days: {m.asked} of {m.people} asked · {m.said_yes} said yes · {plural(m.filled, 'task')} filled
        </Typography>
      )}
    </Page>
  );
}
