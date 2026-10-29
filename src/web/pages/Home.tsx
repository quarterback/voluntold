import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Wordmark } from '../Wordmark';
import { FONT_DISPLAY } from '../theme';

/** The public page. Signed-in people go straight to their organizations. */
export function Home() {
  const navigate = useNavigate();
  const { vt } = useTheme();

  useEffect(() => {
    fetch('/api/me', { credentials: 'same-origin' }).then((r) => { if (r.ok) navigate('/start', { replace: true }); }).catch(() => {});
  }, [navigate]);

  const demo = () => navigate('/login?next=' + encodeURIComponent('/start?demo=1'));
  const lime = { bgcolor: vt.lime, color: vt.onLime, '&:hover': { bgcolor: '#B3E12A' } };
  const frame = { borderRadius: `${vt.radius}px`, overflow: 'hidden', bgcolor: vt.surface, boxShadow: vt.shadowPop };
  const heading = { fontFamily: FONT_DISPLAY, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 };

  return (
    <Box sx={{ bgcolor: vt.bg, color: vt.text }}>
      <Box sx={{ bgcolor: vt.ink, color: vt.onInk }}>
        <Container maxWidth="lg" component="header" sx={{ py: 2.5 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ color: vt.lime }}><Wordmark height={28} /></Box>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => navigate('/login')} sx={{ color: vt.onInk }}>Sign in</Button>
              <Button variant="contained" onClick={demo} sx={lime}>Try the demo</Button>
            </Stack>
          </Stack>
        </Container>
        <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 10 }, pb: { xs: 24, md: 36 } }}>
          <Box sx={{ maxWidth: 760 }}>
            <Typography component="h1" sx={{ ...heading, fontSize: { xs: '2.75rem', md: '4.5rem' }, letterSpacing: '-0.035em', lineHeight: 0.95, mb: 3 }}>
              Volunteers <Box component="em" sx={{ fontStyle: 'italic', color: vt.tangerine }}>activated</Box>
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.0625rem', md: '1.25rem' }, color: vt.onInk2, maxWidth: 600, mb: 4 }}>
              Coordinators keep track of who's in the volunteer queue, write tasks and hand out work.
              Volunteers see what's needed and answer from a link on their phone. No account.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="contained" size="large" onClick={demo} sx={lime}>Try the demo</Button>
              <Button variant="outlined" size="large" onClick={() => navigate('/login')} sx={{ color: vt.onInk, borderColor: vt.onInk, '&:hover': { borderColor: vt.onInk, bgcolor: 'rgba(255,255,255,0.08)' } }}>Sign in</Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" component="main" sx={{ mt: { xs: -20, md: -30 } }}>
        <Box sx={{ ...frame, mb: { xs: 8, md: 14 } }}>
          <img src="/screens/today.png" alt="Today: the decisions waiting, this week's work and capacity" style={{ display: 'block', width: '100%' }} />
        </Box>

        <Stack spacing={{ xs: 8, md: 14 }} sx={{ mb: { xs: 8, md: 14 } }}>
          <Feature
            title="A clean page and two buttons"
            body="A request opens on the volunteer's phone with a date, a place, what to bring and who to find. They accept or decline. If the organization allows it, they pick up open work themselves."
            img="/screens/volunteer.png" alt="A volunteer's page on a phone, with a request and the Accept and Decline buttons" phone
          />
          <Feature
            title="Who fits, who goes first"
            body="Write the task and say what it needs. Only people who fit get asked, and the one who has waited longest goes first. Ask a few at a time, everyone who fits, or pick by hand."
            img="/screens/task.png" alt="A task page showing the people holding spots and the next group to ask" flip
          />
          <Feature
            title="Your people, as records"
            body="Everyone you have, with tags, tiers and availability. Filter by any of it, and save the filter as a list. The tool proposes the tags; you change any of them."
            img="/screens/people.png" alt="The people list with tags, tiers and availability"
          />
          <Feature
            title="Needs become tasks"
            body="Something you want to run, such as a Saturday delivery, holds the assignments and the supplies it can't start without. Each assignment shows who fits or where the gap is. Offer publishes the ones that have people."
            img="/screens/needs.png" alt="The Needs screen with a Saturday delivery and its assignments" flip
          />
        </Stack>

        <Box sx={{ ...frame, bgcolor: vt.ink, color: vt.onInk, textAlign: 'center', p: { xs: 4, md: 8 }, mb: { xs: 6, md: 10 } }}>
          <Typography component="h2" sx={{ ...heading, fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 1.5 }}>See it with sample data</Typography>
          <Typography sx={{ color: vt.onInk2, mb: 3, maxWidth: 480, mx: 'auto' }}>A sample food pantry with 26 volunteers, open work and a short walk through five screens. Sign in with your email.</Typography>
          <Button variant="contained" size="large" onClick={demo} sx={lime}>Try the demo</Button>
        </Box>
      </Container>

      <Container maxWidth="lg" component="footer" sx={{ py: 3 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ color: vt.text }}><Wordmark height={20} /></Box>
          <Button size="small" onClick={() => navigate('/login')}>Sign in</Button>
        </Stack>
      </Container>
    </Box>
  );
}

function Feature({ title, body, img, alt, phone, flip }: { title: string; body: string; img: string; alt: string; phone?: boolean; flip?: boolean }) {
  const { vt } = useTheme();
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 3fr' }, gap: { xs: 3, md: 8 }, alignItems: 'center' }}>
      <Box sx={{ order: { md: flip ? 2 : 1 } }}>
        <Typography component="h2" sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: { xs: '1.75rem', md: '2.25rem' }, letterSpacing: '-0.025em', lineHeight: 1.05, mb: 2 }}>{title}</Typography>
        <Typography sx={{ color: vt.text2, fontSize: '1.0625rem' }}>{body}</Typography>
      </Box>
      <Box sx={{ order: { md: flip ? 1 : 2 }, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ borderRadius: `${vt.radius}px`, overflow: 'hidden', bgcolor: vt.surface, boxShadow: vt.shadowPop, width: phone ? 320 : '100%', maxWidth: '100%' }}>
          <img src={img} alt={alt} style={{ display: 'block', width: '100%' }} />
        </Box>
      </Box>
    </Box>
  );
}
