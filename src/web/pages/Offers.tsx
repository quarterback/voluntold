import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, Link, Snackbar, Stack, Typography } from '@mui/material';
import BackIcon from '@mui/icons-material/ArrowBack';
import ClockIcon from '@mui/icons-material/ScheduleOutlined';
import FileIcon from '@mui/icons-material/DescriptionOutlined';
import CopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { EmptyState, Initials, Loading, Page, StatusBadge, errorText, useLoad } from './common';
import { effortText, TIER_TEXT, usualTimes } from '../format';
import { day, timeRange } from '../../shared/time';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 1.25, py: 0.5 }}>
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>{label}</Typography>
      <Typography variant="body2" component="div">{children}</Typography>
    </Box>
  );
}

/** First offers: one person at a time, with the work proposed for them. */
export function Offers() {
  const { path, org, demo } = useOrg();
  const navigate = useNavigate();
  const { data, error, reload } = useLoad(() => api(path('/offers')), [path]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // The link from the last approval stays on screen after the list reloads.
  const [last, setLast] = useState<string | null>(null);

  if (!data) return <Loading error={error} />;
  const back = <Button size="small" startIcon={<BackIcon fontSize="small" />} onClick={() => navigate(`/o/${org.id}/today`)} sx={{ color: 'text.secondary', ml: -1 }}>Today</Button>;
  if (data.offers.length === 0) {
    return <Page title="First offers" back={back} width={640}><EmptyState title="No first offers right now" /></Page>;
  }
  const at = Math.min(index, data.offers.length - 1);
  const o = data.offers[at];
  const v = o.volunteer;
  const t = o.task;
  const tz = org.timeZone;
  const when = t.timing === 'at_time' && t.startsAt ? `${day(t.startsAt, tz)}, ${timeRange(t.startsAt, t.endsAt, tz)}` : t.timing === 'by_date' && t.dueAt ? `By ${day(t.dueAt, tz)}` : 'Any time';
  const joined = new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  async function skip() {
    setBusy(true);
    try {
      await api(path('/offers/skip'), { body: { volunteerId: v.id, taskId: t.id } });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    setProblem(null);
    try {
      const res = await api(path(`/tasks/${t.id}/ask`), { body: { volunteerIds: [v.id] } });
      const sent = res.asks[0];
      if (!sent) throw new Error('Not sent: they no longer fit');
      let copied = false;
      try { await navigator.clipboard.writeText(sent.message); copied = true; } catch { copied = false; }
      setNote(copied ? `Copied for ${v.name}` : `Sent to ${v.name}`);
      setLast(sent.link);
      await reload();
    } catch (e) {
      setProblem(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="First offers" back={back} width={640}
      action={<Typography variant="body2" color="text.secondary" sx={{ pt: 0.75 }}>{at + 1} of {data.offers.length}</Typography>}>
      <Stack spacing={2}>
        {problem && <Alert severity="warning" onClose={() => setProblem(null)}>{problem}</Alert>}
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Initials name={v.name} size={40} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>{v.name}</Typography>
                <Typography variant="body2" color="text.secondary">Joined {joined} · never asked</Typography>
              </Box>
              {v.tier && <StatusBadge label={TIER_TEXT[v.tier]} />}
            </Stack>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 1.5 }}>
              {v.skills.map((s: string) => <Chip key={s} label={s} />)}
              {v.remoteOk && <Chip label="Remote" />}
              {v.hoursWeek !== null && <Chip icon={<ClockIcon />} label={`${v.hoursWeek} hr a week`} />}
              {v.days.length > 0 && <Chip label={usualTimes(v.days)} />}
            </Stack>
          </CardContent>
        </Card>

        <Typography variant="h2" component="h2">Offer</Typography>
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Link component="button" underline="hover" onClick={() => navigate(`/o/${org.id}/tasks/${t.id}`)}
                sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary', textAlign: 'left' }}>{t.title}</Link>
              {t.remote && <StatusBadge label="Remote" tone="info" />}
            </Stack>
            <Row label="When">{when}</Row>
            {t.effortMinutes && <Row label="Effort">About {effortText(t.effortMinutes)}</Row>}
            {o.needTitle && <Row label="Need">{o.needTitle}</Row>}
            {t.contact && <Row label="Contact">{t.contact}</Row>}
            {t.placePublic && <Row label="Location">{t.placePublic}</Row>}
            {t.files.length > 0 && (
              <Row label="Files">
                {t.files.map((f: any) => (
                  <Link key={f.url} href={f.url} target="_blank" rel="noopener" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mr: 1.5 }}>
                    <FileIcon sx={{ fontSize: 16 }} />{f.name}
                  </Link>
                ))}
              </Row>
            )}
          </CardContent>
        </Card>

        <Typography variant="h2" component="h2">Message</Typography>
        <Box sx={{ bgcolor: (th) => th.vt.subtle, border: (th) => `1px solid ${th.vt.border}`, borderRadius: 2.5, p: 1.75 }}>
          <Typography variant="body2" data-testid="offer-message">{o.message}</Typography>
        </Box>

        {last && demo && (
          <Alert severity="success" onClose={() => setLast(null)}
            action={<Button color="inherit" size="small" href={last} target="_blank" rel="noopener">Open their page</Button>}>
            Link copied
          </Alert>
        )}

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', pt: 1 }}>
          <Button disabled={busy} onClick={skip}>Skip</Button>
          <Stack direction="row" spacing={1}>
            {data.offers.length > 1 && <Button variant="outlined" disabled={busy} onClick={() => setIndex((at + 1) % data.offers.length)}>Next</Button>}
            <Button variant="outlined" onClick={() => navigate(`/o/${org.id}/tasks/${t.id}/edit`)}>Edit</Button>
            <Button variant="contained" startIcon={<CopyIcon fontSize="small" />} disabled={busy} onClick={approve}>Approve and copy</Button>
          </Stack>
        </Stack>
      </Stack>
      <Snackbar open={!!note} autoHideDuration={2500} onClose={() => setNote(null)} message={note} />
    </Page>
  );
}
