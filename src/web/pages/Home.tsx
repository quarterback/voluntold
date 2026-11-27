import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Wordmark } from '../Wordmark';
import { FONT_DISPLAY } from '../theme';
import { BROWSER_DEMO } from '../demoMode';
import { BRAND } from '../../shared/brand';

/** The product page. Everyone lands here; signed-in people get a button into the app. */
export function Home() {
  const navigate = useNavigate();
  const { vt } = useTheme();

  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    fetch('/api/me', { credentials: 'same-origin' }).then((r) => setSignedIn(r.ok)).catch(() => {});
  }, []);

  // The browser demo has no sign-in, so its only way in is the demo.
  const demo = () => navigate(BROWSER_DEMO || signedIn ? '/start?demo=1' : '/login?next=' + encodeURIComponent('/start?demo=1'));
  // On the live site, new organizations sign up here. The browser demo has no accounts.
  const enter = () => navigate(signedIn ? '/start' : '/login?signup=1');
  const enterLabel = signedIn ? `Open ${BRAND.name}` : 'Request free access';
  const signIn = () => navigate('/login');
  const lime = { bgcolor: vt.lime, color: vt.onLime, '&:hover': { bgcolor: '#B3E12A' } };
  const outline = { color: vt.onInk, borderColor: vt.onInk, '&:hover': { borderColor: vt.onInk, bgcolor: 'rgba(255,255,255,0.08)' } };
  const frame = { borderRadius: `${vt.radius}px`, overflow: 'hidden', bgcolor: vt.surface, boxShadow: vt.shadowPop };
  const heading = { fontFamily: FONT_DISPLAY, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 };

  return (
    <Box sx={{ bgcolor: vt.bg, color: vt.text }}>
      <Box sx={{ bgcolor: vt.ink, color: vt.onInk }}>
        <Container maxWidth="lg" component="header" sx={{ py: 2.5 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ color: vt.lime }}><Wordmark height={28} /></Box>
            <Stack direction="row" spacing={1}>
              {BROWSER_DEMO ? (
                <Button variant="contained" onClick={demo} sx={lime}>Try the demo</Button>
              ) : (
                <>
                  {!signedIn && <Button onClick={signIn} sx={{ color: vt.onInk, display: { xs: 'none', sm: 'inline-flex' } }}>Sign in</Button>}
                  <Button variant="contained" onClick={enter} sx={lime}>{enterLabel}</Button>
                </>
              )}
            </Stack>
          </Stack>
        </Container>
        <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 10 }, pb: { xs: 24, md: 36 }, textAlign: 'center' }}>
          <Typography sx={{ color: vt.lime, fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase', mb: 2 }}>
            Free membership and volunteer management
          </Typography>
          <Typography component="h1" sx={{ ...heading, fontSize: { xs: '2.75rem', md: '4.75rem' }, letterSpacing: '-0.035em', lineHeight: 0.95, mb: 3, maxWidth: 860, mx: 'auto' }}>
            Put your membership <Box component="em" sx={{ fontStyle: 'italic', color: vt.tangerine }}>to work.</Box>
          </Typography>
          <Typography sx={{ fontSize: { xs: '1.0625rem', md: '1.25rem' }, color: vt.onInk2, maxWidth: 640, mx: 'auto', mb: 4 }}>
            Manage your roster, organize committees, recruit volunteers, fill positions and distribute responsibilities across your membership.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'center' }}>
            {!BROWSER_DEMO && <Button variant="contained" size="large" onClick={enter} sx={lime}>{enterLabel}</Button>}
            <Button variant={BROWSER_DEMO ? 'contained' : 'outlined'} size="large" onClick={demo} sx={BROWSER_DEMO ? lime : outline}>Try the demo</Button>
          </Stack>
          {!BROWSER_DEMO && <Typography sx={{ color: vt.onInk2, mt: 2, fontSize: '0.9375rem' }}>Unlimited members. No per-person fees.</Typography>}
        </Container>
      </Box>

      <Container maxWidth="lg" component="main" sx={{ mt: { xs: -20, md: -30 } }}>
        <Box sx={{ ...frame, mb: { xs: 10, md: 16 } }}>
          <img src="/screens/today.png" alt="Today: the decisions waiting, this week's work and capacity" style={{ display: 'block', width: '100%' }} />
        </Box>

        <Typography component="h2" sx={{ ...heading, fontSize: { xs: '1.75rem', md: '2.5rem' }, textAlign: 'center', maxWidth: 760, mx: 'auto', mb: { xs: 8, md: 12 } }}>
          A big list means little if the same few people do everything.
        </Typography>

        <Stack spacing={{ xs: 10, md: 16 }} sx={{ mb: { xs: 10, md: 16 } }}>
          <Feature
            title="Ask the right people"
            lines={[`Write a task, and ${BRAND.name} emails the people who fit. Whoever has waited longest goes first.`, 'People tap Accept or Decline from their phone. They never make an account.']}
            img="/screens/volunteer.png" alt="A volunteer's page on a phone, with a request and the Accept and Decline buttons" phone flip
          />
          <Feature
            title="Every role has a history"
            lines={['See who holds each position, whose term ends soon and which seats are empty.', 'When someone steps down, the next person inherits the notes and the open work.']}
            img="/screens/roles.png" alt="The Roles screen: a vacant committee lead, two terms ending soon and four filled positions"
          />
          <Feature
            title="Your roster, your way"
            lines={['Bring your spreadsheet. Track renewals and dues if you have them, and run a report of who is due.']}
            img="/screens/roster.png" alt="The people list for a coaches association, with each member's category" flip
          />
        </Stack>

        <Box sx={{ ...frame, bgcolor: vt.ink, color: vt.onInk, textAlign: 'center', p: { xs: 4, md: 8 }, mb: { xs: 6, md: 10 } }}>
          <Typography component="h2" sx={{ ...heading, fontSize: { xs: '1.75rem', md: '2.5rem' }, mb: 1.5 }}>Put your list to work</Typography>
          <Typography sx={{ color: vt.onInk2, mb: 3, maxWidth: 480, mx: 'auto' }}>{BROWSER_DEMO ? 'Pick a sample organization and follow the guide through every feature.' : 'Free for unlimited members.'}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'center' }}>
            {!BROWSER_DEMO && <Button variant="contained" size="large" onClick={enter} sx={lime}>{enterLabel}</Button>}
            <Button variant={BROWSER_DEMO ? 'contained' : 'outlined'} size="large" onClick={demo} sx={BROWSER_DEMO ? lime : outline}>Try the demo</Button>
          </Stack>
        </Box>
      </Container>

      <Container maxWidth="lg" component="footer" sx={{ py: 3 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ color: vt.text }}><Wordmark height={20} /></Box>
          {!BROWSER_DEMO && <Button size="small" onClick={signedIn ? enter : signIn}>{signedIn ? enterLabel : 'Sign in'}</Button>}
        </Stack>
      </Container>
    </Box>
  );
}

function Feature({ title, lines, img, alt, phone, flip }: { title: string; lines: string[]; img: string; alt: string; phone?: boolean; flip?: boolean }) {
  const { vt } = useTheme();
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 3fr' }, gap: { xs: 3, md: 8 }, alignItems: 'center' }}>
      <Box sx={{ order: { md: flip ? 2 : 1 } }}>
        <Typography component="h2" sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.02em', lineHeight: 1.1, mb: 2 }}>{title}</Typography>
        {lines.map((t) => <Typography key={t} sx={{ color: vt.text2, fontSize: '1.0625rem', mb: 1 }}>{t}</Typography>)}
      </Box>
      <Box sx={{ order: { md: flip ? 1 : 2 }, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ borderRadius: `${vt.radius}px`, overflow: 'hidden', bgcolor: vt.surface, boxShadow: vt.shadowPop, width: phone ? 320 : '100%', maxWidth: '100%' }}>
          <img src={img} alt={alt} style={{ display: 'block', width: '100%' }} />
        </Box>
      </Box>
    </Box>
  );
}
