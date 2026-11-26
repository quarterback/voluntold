import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardActionArea, CardContent, Divider, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Loading, Page, Section, useLoad } from './common';
import { FONT_DISPLAY } from '../theme';
import { MessageDialog, peopleWords } from './membership';

type Group = 'd30' | 'd60' | 'd90' | 'expired';

interface Summary {
  people: number;
  categories: { category: string | null; count: number }[];
  renewals: Record<Group, number> | null;
  participation: { offered: number; accepted: number; tookPart: number; neverOffered: number };
  roles: { total: number; vacant: number; endingSoon: number };
  applications: number;
}

interface RenewalRow {
  id: string;
  name: string;
  email: string | null;
  category: string | null;
  expiresAt: number;
  duesPaidAt: number | null;
}

const GROUP_LABEL: Record<Group, string> = {
  d30: 'Next 30 days',
  d60: '31 to 60 days',
  d90: '61 to 90 days',
  expired: 'Expired, last 90 days',
};

/** Columns shown only on screens wider than a phone. */
const wide = { display: { xs: 'none', sm: 'table-cell' } };

const md = (ms: number | null) => (ms === null ? '' : new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));

/** A number and its label. With onClick it opens the people behind the number. */
function Count({ label, value, selected, onClick }: { label: string; value: number; selected?: boolean; onClick?: () => void }) {
  const { vt } = useTheme();
  const body = (
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '1.75rem', lineHeight: 1 }}>{value.toLocaleString('en-US')}</Typography>
      <Typography variant="body2" sx={{ mt: 0.75, color: selected ? 'inherit' : 'text.secondary', fontWeight: 600 }}>{label}</Typography>
    </CardContent>
  );
  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 140, bgcolor: selected ? vt.lime : undefined, color: selected ? vt.onLime : undefined }}>
      {onClick ? <CardActionArea onClick={onClick} sx={{ height: '100%' }}>{body}</CardActionArea> : body}
    </Card>
  );
}

function Counts({ children }: { children: React.ReactNode }) {
  return <Stack direction="row" useFlexGap spacing={1.5} sx={{ flexWrap: 'wrap' }}>{children}</Stack>;
}

/** Reports: totals first, then the people in one group, with Export and Email. */
export function Reports() {
  const { path, org, me } = useOrg();
  const navigate = useNavigate();
  const words = peopleWords(org.peopleWord);
  const { data, error } = useLoad(() => api<Summary>(path('/reports')), [path]);
  if (!data) return <Loading error={error} />;
  const p = data.participation;
  return (
    <Page title="Reports" subtitle={`${data.people.toLocaleString('en-US')} ${words.people}`}>
      <Stack spacing={2}>
        {data.renewals && <Renewals counts={data.renewals} canEdit={me.role !== 'lead'} />}

        <Section title="Last 90 days">
          <Counts>
            <Count label="Offered a task" value={p.offered} />
            <Count label="Accepted" value={p.accepted} />
            <Count label="Took part" value={p.tookPart} />
            <Count label="Never offered a task" value={p.neverOffered} onClick={() => navigate('../people?filter=never', { relative: 'path' })} />
          </Counts>
        </Section>

        <Section title="Roles">
          <Counts>
            <Count label="Roles" value={data.roles.total} onClick={() => navigate('../roles', { relative: 'path' })} />
            <Count label="Vacant" value={data.roles.vacant} onClick={() => navigate('../roles', { relative: 'path' })} />
            <Count label="Terms ending in 60 days" value={data.roles.endingSoon} onClick={() => navigate('../roles', { relative: 'path' })} />
            {data.applications > 0 && <Count label="Applications waiting" value={data.applications} onClick={() => navigate('../people', { relative: 'path' })} />}
          </Counts>
        </Section>

        {data.categories.some((c) => c.category) && (
          <Section title="By category">
            <Stack divider={<Divider />}>
              {data.categories.map((c) => (
                <Stack key={c.category ?? ''} direction="row" sx={{ justifyContent: 'space-between', py: 1 }}>
                  <Typography>{c.category ?? 'No category'}</Typography>
                  <Typography sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{c.count.toLocaleString('en-US')}</Typography>
                </Stack>
              ))}
            </Stack>
          </Section>
        )}
      </Stack>
    </Page>
  );
}

function Renewals({ counts, canEdit }: { counts: Record<Group, number>; canEdit: boolean }) {
  const { path } = useOrg();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group>('d30');
  const [messaging, setMessaging] = useState(false);
  const rows = useLoad(() => api<{ rows: RenewalRow[] }>(path(`/reports/renewals/${group}`)), [group, path]);
  const list = rows.data?.rows ?? [];
  return (
    <Section title="Renewals">
      <Counts>
        {(Object.keys(GROUP_LABEL) as Group[]).map((g) => (
          <Count key={g} label={GROUP_LABEL[g]} value={counts[g]} selected={g === group} onClick={() => setGroup(g)} />
        ))}
      </Counts>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 2.5, mb: 1, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h3">{GROUP_LABEL[group]}</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" disabled={list.length === 0} href={path(`/reports/renewals/${group}?format=csv`)}>Export CSV</Button>
          {canEdit && <Button size="small" variant="contained" disabled={list.length === 0} onClick={() => setMessaging(true)}>Email {list.length}</Button>}
        </Stack>
      </Stack>
      {!rows.data ? <Loading error={rows.error} /> : list.length === 0 ? <Typography color="text.secondary">None</Typography> : (
        <TableContainer sx={{ maxHeight: 480 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell sx={wide}>Category</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell sx={wide}>Dues paid</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`../people/${r.id}`, { relative: 'path' })}>
                  <TableCell>
                    {r.name}
                    {r.category && <Typography variant="body2" color="text.secondary" sx={{ display: { sm: 'none' } }}>{r.category}</Typography>}
                  </TableCell>
                  <TableCell sx={wide}>{r.category}</TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{md(r.expiresAt)}</TableCell>
                  <TableCell sx={{ ...wide, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{md(r.duesPaidAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {messaging && <MessageDialog path={path} volunteerIds={list.map((r) => r.id)} onClose={() => setMessaging(false)} />}
    </Section>
  );
}
