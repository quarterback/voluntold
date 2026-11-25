import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Wordmark } from '../Wordmark';
import { FONT_DISPLAY } from '../theme';
import { BROWSER_DEMO } from '../demoMode';

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
  const enterLabel = signedIn ? 'Open Volley' : 'Start free';
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
                  {!signedIn && <Button onClick={signIn} sx={{ color: vt.onInk }}>Sign in</Button>}
                  <Button variant="contained" onClick={enter} sx={lime}>{enterLabel}</Button>
                </>
              )}
            </Stack>
          </Stack>
        </Container>
        <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 10 }, pb: { xs: 24, md: 36 } }}>
          <Box sx={{ maxWidth: 760 }}>
            <Typography component="h1" sx={{ ...heading, fontSize: { xs: '2.75rem', md: '4.5rem' }, letterSpacing: '-0.035em', lineHeight: 0.95, mb: 3 }}>
              Volunteers <Box component="em" sx={{ fontStyle: 'italic', color: vt.tangerine }}>activated</Box>
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.0625rem', md: '1.25rem' }, color: vt.onInk2, maxWidth: 600, mb: 4 }}>
              Volley asks the right volunteers for each task by email. They answer from their phone, with no account.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {!BROWSER_DEMO && <Button variant="contained" size="large" onClick={enter} sx={lime}>{enterLabel}</Button>}
              <Button variant={BROWSER_DEMO ? 'contained' : 'outlined'} size="large" onClick={demo} sx={BROWSER_DEMO ? lime : outline}>Try the demo</Button>
            </Stack>
            {!BROWSER_DEMO && <Typography sx={{ color: vt.onInk2, mt: 2, fontSize: '0.9375rem' }}>Free to use. No card needed.</Typography>}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" component="main" sx={{ mt: { xs: -20, md: -30 } }}>
        <Box sx={{ ...frame, mb: { xs: 8, md: 14 } }}>
          <img src="/screens/today.png" alt="Today: the decisions waiting, this week's work and capacity" style={{ display: 'block', width: '100%' }} />
        </Box>

        <Box sx={{ maxWidth: 760, mb: { xs: 8, md: 14 } }}>
          <Typography component="h2" sx={{ ...heading, fontSize: { xs: '2rem', md: '3rem' }, letterSpacing: '-0.03em', mb: 2.5 }}>People said yes. Nobody asked them.</Typography>
          {[
            'Most organizations have a list of people who offered to help.',
            'The list sits in a spreadsheet, and the same few people end up doing everything.',
            'Volley works through the whole list, starting with whoever has waited longest.',
          ].map((t) => <Typography key={t} sx={{ color: vt.text2, fontSize: { xs: '1.0625rem', md: '1.25rem' }, mb: 1 }}>{t}</Typography>)}
        </Box>

        <Box sx={{ mb: { xs: 8, md: 14 } }}>
          <Typography component="h2" sx={{ ...heading, fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 3 }}>How it works</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            {STEPS.map((step, i) => (
              <Box key={step.title} sx={{ ...frame, boxShadow: 'none', p: 3 }}>
                <Typography sx={{ ...heading, color: vt.tangerine, fontSize: '1.5rem', mb: 1 }}>{i + 1}</Typography>
                <Typography component="h3" sx={{ ...heading, fontSize: '1.375rem', mb: 1 }}>{step.title}</Typography>
                <Typography sx={{ color: vt.text2 }}>{step.text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Stack spacing={{ xs: 8, md: 14 }} sx={{ mb: { xs: 8, md: 14 } }}>
          <Feature
            title="Two buttons on their phone"
            lines={['Each ask opens a page with the date, the place, what to bring and who to find.', 'Volunteers tap Accept or Decline. They never make an account.']}
            img="/screens/volunteer.png" alt="A volunteer's page on a phone, with a request and the Accept and Decline buttons" phone
          />
          <Feature
            title="Fair to every volunteer"
            lines={["Only people who meet the task's requirements get asked. Whoever has waited longest goes first.", 'Nobody gets more than two asks a week, unless you change the limit.']}
            img="/screens/task.png" alt="A task page showing the people holding spots and the next group to ask" flip
          />
          <Feature
            title="Everyone you have, in one place"
            lines={['Track the details that matter to you, such as skills, languages, experience and availability.', 'Filter by any of them and save the filter as a list.']}
            img="/screens/people.png" alt="The people list with tags, tiers and availability"
          />
          <Feature
            title="Plan the whole event"
            lines={['A Saturday delivery or a pledge drive holds every assignment and supply it takes.', 'Each assignment shows who fits, or where you have a gap.']}
            img="/screens/needs.png" alt="The Needs screen with a Saturday delivery and its assignments" flip
          />
        </Stack>

        <Box sx={{ maxWidth: 760, mb: { xs: 8, md: 14 } }}>
          <Typography component="h2" sx={{ ...heading, fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 3 }}>Questions</Typography>
          <Stack spacing={3}>
            {QUESTIONS.map((q) => (
              <Box key={q.q}>
                <Typography component="h3" sx={{ fontWeight: 600, fontSize: '1.125rem', mb: 0.5 }}>{q.q}</Typography>
                {q.a.map((t) => <Typography key={t} sx={{ color: vt.text2 }}>{t}</Typography>)}
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ ...frame, bgcolor: vt.ink, color: vt.onInk, textAlign: 'center', p: { xs: 4, md: 8 }, mb: { xs: 6, md: 10 } }}>
          <Typography component="h2" sx={{ ...heading, fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 1.5 }}>Put your list to work</Typography>
          <Typography sx={{ color: vt.onInk2, mb: 3, maxWidth: 480, mx: 'auto' }}>{BROWSER_DEMO ? 'Pick a sample organization and follow the guide through every feature.' : 'Set up your organization now, or try it first with sample data.'}</Typography>
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

const STEPS = [
  { title: 'Bring your list', text: 'Upload the spreadsheet, Word file or PDF you already have. Volley suggests where each column goes.' },
  { title: 'Write the task', text: 'Say what, when, where and how many people. Add what they need, like a skill or a team.' },
  { title: 'Ask, and watch it fill', text: 'Volley emails the people who fit. They accept or decline from their phone.' },
];

const QUESTIONS = [
  { q: 'What does it cost?', a: ["It's free. Sign up and use every feature."] },
  { q: 'Do volunteers need an account?', a: ['No. Each person gets a private link by email and answers from any phone.'] },
  { q: 'What happens after someone says yes?', a: ['They get a confirmation with the address, then a reminder the day before.', "If a task starting within two days isn't full, you get an email."] },
  { q: 'How do we log hours?', a: ["You don't. When a task's time passes, everyone who held a spot counts as attended."] },
  { q: 'Can more than one person run it?', a: ["Yes. Add coordinators and team leads. Team leads manage their own team's people."] },
  { q: 'Can we take our data with us?', a: ['Yes. Export your volunteers and tasks whenever you want.'] },
];

function Feature({ title, lines, img, alt, phone, flip }: { title: string; lines: string[]; img: string; alt: string; phone?: boolean; flip?: boolean }) {
  const { vt } = useTheme();
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 3fr' }, gap: { xs: 3, md: 8 }, alignItems: 'center' }}>
      <Box sx={{ order: { md: flip ? 2 : 1 } }}>
        <Typography component="h2" sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: { xs: '1.75rem', md: '2.25rem' }, letterSpacing: '-0.025em', lineHeight: 1.05, mb: 2 }}>{title}</Typography>
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
