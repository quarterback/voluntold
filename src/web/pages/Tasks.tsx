import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, Divider, LinearProgress, ListItemButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { EmptyState, Loading, Page, StatusBadge, useLoad, type Tone } from './common';
import { STATUS_TEXT, when } from '../format';
import { TagRow } from './tags';

export const STATUS_TONE: Record<string, Tone> = { draft: 'neutral', open: 'accent', filled: 'success', canceled: 'danger', done: 'neutral' };

const COLUMNS = { xs: '1fr auto', md: 'minmax(0, 2.2fr) minmax(0, 1.6fr) 96px 140px' };

function TaskRows({ tasks }: { tasks: any[] }) {
  const navigate = useNavigate();
  const { org } = useOrg();
  return (
    <Card>
      <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: COLUMNS.md, gap: 2, px: 2.5, py: 1, bgcolor: (t) => t.vt.subtle }}>
        {['Task', 'When', 'Status', 'Filled'].map((h) => <Typography key={h} variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>{h}</Typography>)}
      </Box>
      {tasks.map((t, i) => (
        <Box key={t.id}>
          <Divider />
          <ListItemButton onClick={() => navigate(t.id)} sx={{ borderRadius: 0, px: 2.5, py: 1.5, display: 'grid', gridTemplateColumns: COLUMNS, gap: { xs: 1, md: 2 }, alignItems: 'center' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h3" component="h2" noWrap>{t.title}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ display: { md: 'none' } }}>{when(t, org.timeZone)}</Typography>
              {t.placePublic && <Typography variant="body2" color="text.secondary" noWrap sx={{ display: { xs: 'none', md: 'block' } }}>{t.placePublic}</Typography>}
              <TagRow tagIds={t.tags ?? []} max={3} sx={{ mt: 0.5 }} />
            </Box>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ display: { xs: 'none', md: 'block' } }}>{when(t, org.timeZone)}</Typography>
            <Box><StatusBadge label={STATUS_TEXT[t.status]} tone={STATUS_TONE[t.status]} /></Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {t.taken} of {t.peopleNeeded}{t.waiting ? `, ${t.waiting} pending` : ''}
              </Typography>
              <LinearProgress variant="determinate" value={Math.min(100, (t.taken / t.peopleNeeded) * 100)} aria-label={`${t.taken} of ${t.peopleNeeded} filled`} />
            </Box>
          </ListItemButton>
        </Box>
      ))}
    </Card>
  );
}

export function Tasks() {
  const { path } = useOrg();
  const navigate = useNavigate();
  const { data, error } = useLoad(() => api(path('/tasks')), [path]);
  if (!data) return <Loading error={error} />;
  const active = data.tasks.filter((t: any) => ['draft', 'open', 'filled'].includes(t.status));
  const finished = data.tasks.filter((t: any) => !['draft', 'open', 'filled'].includes(t.status)).reverse();
  const newTask = <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('new')}>New task</Button>;
  return (
    <Page title="Tasks" action={data.tasks.length > 0 && newTask}>
      {active.length === 0
        ? <EmptyState title="No open tasks" action={data.tasks.length === 0 && newTask} />
        : <TaskRows tasks={active} />}
      {finished.length > 0 && (
        <>
          <Typography variant="h2" component="h2" sx={{ mt: 4, mb: 1 }}>Past</Typography>
          <TaskRows tasks={finished} />
        </>
      )}
    </Page>
  );
}
