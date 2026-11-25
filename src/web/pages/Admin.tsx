import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import { Loading, Page, StatusBadge, errorText, useLoad } from './common';
import { day } from '../../shared/time';

interface AdminOrg {
  id: string;
  name: string;
  createdAt: number;
  approved: boolean;
  emailDailyLimit: number;
  creator: string | null;
  people: number;
  tasks: number;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** For admins of the tool: approve new organizations and set their email limits. */
export function Admin() {
  const { data, error, reload } = useLoad(() => api<{ orgs: AdminOrg[] }>('/api/admin/orgs'), []);
  const [problem, setProblem] = useState<string | null>(null);
  if (!data) return <Loading error={error} />;

  async function act(path: string, body: unknown = {}) {
    setProblem(null);
    try {
      await api(path, { body });
      await reload();
    } catch (err) {
      setProblem(errorText(err));
    }
  }

  const pending = data.orgs.filter((o) => !o.approved).length;
  return (
    <Page title="Organizations" subtitle={`${pending} pending`}>
      {problem && <Alert severity="error" sx={{ mb: 2 }}>{problem}</Alert>}
      <Stack spacing={1.5}>
        {data.orgs.map((o) => <OrgRow key={o.id} org={o} act={act} />)}
      </Stack>
    </Page>
  );
}

function OrgRow({ org, act }: { org: AdminOrg; act: (path: string, body?: unknown) => Promise<void> }) {
  const [limit, setLimit] = useState(String(org.emailDailyLimit));
  const base = `/api/admin/orgs/${org.id}`;
  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h3">{org.name}</Typography>
            <Typography variant="body2" color="text.secondary">{[org.creator, day(org.createdAt), count(org.people, 'person', 'people'), count(org.tasks, 'task', 'tasks')].filter(Boolean).join(' · ')}</Typography>
          </Box>
          <StatusBadge label={org.approved ? 'Approved' : 'Pending'} tone={org.approved ? 'success' : 'warning'} />
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          {org.approved
            ? <Button key="revoke" color="error" onClick={() => act(`${base}/revoke`)}>Revoke approval</Button>
            : <Button key="approve" variant="contained" onClick={() => act(`${base}/approve`)}>Approve</Button>}
          <TextField label="Emails per day" size="small" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} sx={{ width: 150 }} />
          <Button disabled={limit === String(org.emailDailyLimit)} onClick={() => act(`${base}/limit`, { emailDailyLimit: Number(limit) })}>Save</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
