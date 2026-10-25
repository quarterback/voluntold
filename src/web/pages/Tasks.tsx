import { useNavigate } from 'react-router-dom';
import { Button, Card, CardActionArea, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Empty, Loading, Page, useLoad } from './common';
import { STATUS_TEXT, when } from '../format';

export function Tasks() {
  const { path } = useOrg();
  const navigate = useNavigate();
  const { data, error } = useLoad(() => api(path('/tasks')), [path]);
  if (!data) return <Loading error={error} />;
  const active = data.tasks.filter((t: any) => ['draft', 'open', 'filled'].includes(t.status));
  const finished = data.tasks.filter((t: any) => !['draft', 'open', 'filled'].includes(t.status)).reverse();
  const row = (t: any) => (
    <Card key={t.id}>
      <CardActionArea onClick={() => navigate(t.id)}>
        <CardContent>
          <Typography variant="h3" component="h2">{t.title}</Typography>
          <Typography color="text.secondary">{when(t)}{t.placePublic ? ` · ${t.placePublic}` : ''}</Typography>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            {STATUS_TEXT[t.status]} · {t.taken} of {t.peopleNeeded} said yes{t.waiting ? ` · ${t.waiting} waiting to answer` : ''}
          </Typography>
          <LinearProgress variant="determinate" value={Math.min(100, (t.taken / t.peopleNeeded) * 100)} aria-label={`${t.taken} of ${t.peopleNeeded} spots taken`} />
        </CardContent>
      </CardActionArea>
    </Card>
  );
  return (
    <Page title="Tasks" action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('new')}>New task</Button>}>
      <Stack spacing={1.5}>
        {active.length === 0 && <Empty>No open tasks. Write one with New task.</Empty>}
        {active.map(row)}
      </Stack>
      {finished.length > 0 && (
        <>
          <Typography variant="h2" component="h2" sx={{ mt: 4, mb: 1.5 }}>Finished</Typography>
          <Stack spacing={1.5}>{finished.map(row)}</Stack>
        </>
      )}
    </Page>
  );
}
