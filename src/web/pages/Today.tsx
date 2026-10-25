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
        title: item.firstRound ? `Ask people for ${item.title}` : `Time to ask the next group for ${item.title}`,
        body: `${plural(item.openSpots!, 'spot')} open, ${plural(item.fits!, 'person', 'people')} who fit${item.soon && item.startsAt ? `. Starts ${when({ timing: 'at_time', startsAt: item.startsAt, endsAt: item.startsAt, dueAt: null }).split(',')[0]}` : ''}.`,
        to: `tasks/${item.taskId}`,
      };
    case 'no_one_left':
      return {
        title: `Nobody else fits ${item.title}`,
        body: `${plural(item.openSpots!, 'spot')} still open. Change the requirements or add people.`,
        to: `tasks/${item.taskId}`,
      };
    case 'draft':
      return { title: `Finish ${item.title}`, body: 'This task is a draft. Open it to start asking people.', to: `tasks/${item.taskId}` };
    case 'never_asked':
      return { title: `${plural(item.count!, 'person', 'people')} never asked`, body: 'They agreed to help and nobody has asked them yet.', to: 'people?filter=never' };
    case 'paused_no_answer':
      return {
        title: `${plural(item.count!, 'person', 'people')} paused after three unanswered asks`,
        body: `${item.people!.map((p) => p.name).join(', ')}${item.count! > item.people!.length ? ' and others' : ''}. They're asked again once they answer anything.`,
        to: 'people?filter=paused',
      };
    case 'set_aside':
      return { title: `${plural(item.count!, 'row')} set aside from ${item.fileName}`, body: 'These rows had no name or no way to send a link.', to: 'import' };
    case 'atproto_error':
      return { title: `Couldn't post ${item.title} to AT Protocol`, body: item.message ?? '', to: `tasks/${item.taskId}` };
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
      <Stack spacing={1.5}>
        {items.length === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h3">Nothing needs you right now</Typography>
              <Typography color="text.secondary">Every open task is full or waiting on answers.</Typography>
            </CardContent>
          </Card>
        )}
        {items.map((item, i) => (
          <Card key={i}>
            <CardActionArea onClick={() => navigate(`../${item!.to}`, { relative: 'path' })}>
              <CardContent>
                <Typography variant="h3" component="h2">{item!.title}</Typography>
                <Typography color="text.secondary">{item!.body}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
      {m && m.people > 0 && (
        <Typography color="text.secondary" sx={{ mt: 4 }}>
          In the last 30 days: {plural(m.asked, 'person', 'people')} of {m.people} asked, {m.said_yes} said yes to something, {plural(m.filled, 'task')} filled.
        </Typography>
      )}
    </Page>
  );
}
