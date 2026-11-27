import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Wordmark } from '../Wordmark';
import { FONT_DISPLAY } from '../theme';
import { BROWSER_DEMO } from '../demoMode';
import { BRAND } from '../../shared/brand';

// A landing page for search and ads: people comparing ManyArms with
// WildApricot. The home page doesn't link here, so it stays free of
// competitor names. Keep every claim about WildApricot to what its own
// pricing page says, and update the date when you check it again.
const CHECKED = 'November 27, 2026';
const PRICE = '$66';

/** The WildApricot comparison page at /wildapricot-alternative. */
export function Alternative() {
  const navigate = useNavigate();
  const { vt } = useTheme();

  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    document.title = `The free WildApricot alternative | ${BRAND.name}`;
    fetch('/api/me', { credentials: 'same-origin' }).then((r) => setSignedIn(r.ok)).catch(() => {});
    return () => { document.title = `${BRAND.name}: ${BRAND.tagline}`; };
  }, []);

  const demo = () => navigate(BROWSER_DEMO || signedIn ? '/start?demo=1' : '/login?next=' + encodeURIComponent('/start?demo=1'));
  const enter = () => navigate(signedIn ? '/start' : '/login?signup=1');
  const enterLabel = signedIn ? `Open ${BRAND.name}` : 'Request free access';
  const lime = { bgcolor: vt.lime, color: vt.onLime, '&:hover': { bgcolor: '#B3E12A' } };
  const outline = { color: vt.onInk, borderColor: vt.onInk, '&:hover': { borderColor: vt.onInk, bgcolor: 'rgba(255,255,255,0.08)' } };
  const frame = { borderRadius: `${vt.radius}px`, overflow: 'hidden', bgcolor: vt.surface, boxShadow: vt.shadowPop };
  const heading = { fontFamily: FONT_DISPLAY, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 };
  const h2 = { ...heading, fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 3 };
  const section = { mb: { xs: 8, md: 12 } };
  const buttons = (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      {!BROWSER_DEMO && <Button variant="contained" size="large" onClick={enter} sx={lime}>{enterLabel}</Button>}
      <Button variant={BROWSER_DEMO ? 'contained' : 'outlined'} size="large" onClick={demo} sx={BROWSER_DEMO ? lime : outline}>Try the demo</Button>
    </Stack>
  );

  return (
    <Box sx={{ bgcolor: vt.bg, color: vt.text }}>
      <Box sx={{ bgcolor: vt.ink, color: vt.onInk }}>
        <Container maxWidth="lg" component="header" sx={{ py: 2.5 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box component="a" href="/" aria-label={`${BRAND.name} home`} sx={{ color: vt.lime, display: 'flex' }}><Wordmark height={28} /></Box>
            {!BROWSER_DEMO && <Button variant="contained" onClick={enter} sx={lime}>{enterLabel}</Button>}
          </Stack>
        </Container>
        <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 10 }, pb: { xs: 8, md: 12 } }}>
          <Box sx={{ maxWidth: 780 }}>
            <Typography component="h1" sx={{ ...heading, fontSize: { xs: '2.5rem', md: '4rem' }, letterSpacing: '-0.035em', lineHeight: 0.95, mb: 3 }}>
              The free <Box component="em" sx={{ fontStyle: 'italic', color: vt.tangerine }}>WildApricot</Box> alternative
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.0625rem', md: '1.25rem' }, color: vt.onInk2, maxWidth: 620, mb: 1.5 }}>
              Keep your roster, renewals, roles and member email in one place.
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.0625rem', md: '1.25rem' }, color: vt.onInk2, maxWidth: 620, mb: 4 }}>
              {`${BRAND.name} is free for any number of members, so your bill stays at zero as you grow.`}
            </Typography>
            {buttons}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" component="main" sx={{ pt: { xs: 8, md: 12 } }}>
        <Box sx={section}>
          <Typography component="h2" sx={h2}>What a growing list costs</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, maxWidth: 900 }}>
            <PriceCard name="WildApricot" price={PRICE} unit="a month" lines={['For up to 100 contacts, billed monthly.', 'The price goes up as your contact count grows.']} />
            <PriceCard name={BRAND.name} price="$0" unit="a month" lines={['For any number of members.', 'Every feature is included.']} highlight />
          </Box>
          <Typography variant="body2" sx={{ color: vt.text2, mt: 2 }}>
            {`WildApricot's 100 Contacts plan, billed monthly, from wildapricot.com/pricing on ${CHECKED}.`}
          </Typography>
        </Box>

        <Box sx={{ ...section, maxWidth: 900 }}>
          <Typography component="h2" sx={h2}>How they compare</Typography>
          <TableContainer sx={{ ...frame, boxShadow: 'none', border: `1px solid ${vt.border}` }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell sx={{ fontWeight: 700 }}>WildApricot</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{BRAND.name}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {COMPARE.map(([what, them, us]) => (
                  <TableRow key={what}>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>{what}</TableCell>
                    <TableCell sx={{ color: vt.text2 }}>{them}</TableCell>
                    <TableCell>{us}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box sx={section}>
          <Typography component="h2" sx={h2}>Built to get people involved</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: { xs: 3, md: 5 } }}>
            {INVOLVED.map((item) => (
              <Box key={item.title} sx={{ borderTop: `1px solid ${vt.border}`, pt: 2 }}>
                <Typography component="h3" sx={{ fontWeight: 600, fontSize: '1.125rem', mb: 0.75 }}>{item.title}</Typography>
                <Typography sx={{ color: vt.text2 }}>{item.text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ ...section, maxWidth: 760 }}>
          <Typography component="h2" sx={h2}>Moving from WildApricot</Typography>
          <Box component="ol" sx={{ pl: 3, m: 0, '& li': { mb: 1.5, color: vt.text2, fontSize: '1.0625rem' } }}>
            <li>Export your contacts from WildApricot as a CSV file.</li>
            <li>{`Import the file into ${BRAND.name}. It recognizes columns such as Membership level, Renewal due and Member since.`}</li>
            <li>Check the matches, then add your board, committees and roles.</li>
          </Box>
        </Box>

        <Box sx={{ ...section, maxWidth: 760 }}>
          <Typography component="h2" sx={{ ...h2, mb: 2 }}>When WildApricot is the better fit</Typography>
          <Typography sx={{ color: vt.text2, fontSize: '1.0625rem', mb: 1 }}>
            Some groups need a member website, event ticketing and online dues payments in one account.
          </Typography>
          <Typography sx={{ color: vt.text2, fontSize: '1.0625rem' }}>
            {`WildApricot does all three. ${BRAND.name} doesn't, so stay where you are if you rely on them.`}
          </Typography>
        </Box>

        <Box sx={{ ...section, maxWidth: 760 }}>
          <Typography component="h2" sx={h2}>Questions</Typography>
          <Stack spacing={3}>
            {QUESTIONS.map((q) => (
              <Box key={q.q}>
                <Typography component="h3" sx={{ fontWeight: 600, fontSize: '1.125rem', mb: 0.5 }}>{q.q}</Typography>
                <Typography sx={{ color: vt.text2 }}>{q.a}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ ...frame, bgcolor: vt.ink, color: vt.onInk, textAlign: 'center', p: { xs: 4, md: 8 }, mb: { xs: 6, md: 10 } }}>
          <Typography component="h2" sx={{ ...heading, fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 1.5 }}>Put your membership to work</Typography>
          <Typography sx={{ color: vt.onInk2, mb: 3, maxWidth: 480, mx: 'auto' }}>Request access now, or try it first with sample data.</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>{buttons}</Box>
        </Box>
      </Container>

      <Container maxWidth="lg" component="footer" sx={{ py: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Box component="a" href="/" aria-label={`${BRAND.name} home`} sx={{ color: vt.text, display: 'flex' }}><Wordmark height={20} /></Box>
          <Typography variant="body2" sx={{ color: vt.text2 }}>{`WildApricot is a trademark of its owner. ${BRAND.name} is not affiliated with it.`}</Typography>
        </Stack>
      </Container>
    </Box>
  );
}

function PriceCard({ name, price, unit, lines, highlight }: { name: string; price: string; unit: string; lines: string[]; highlight?: boolean }) {
  const { vt } = useTheme();
  return (
    <Box sx={{ borderRadius: `${vt.radius}px`, p: { xs: 3, md: 4 }, bgcolor: highlight ? vt.ink : vt.surface, color: highlight ? vt.onInk : vt.text, border: highlight ? 'none' : `1px solid ${vt.border}` }}>
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{name}</Typography>
      <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: { xs: '3rem', md: '3.75rem' }, lineHeight: 1, color: highlight ? vt.lime : undefined }}>
        {price} <Box component="span" sx={{ fontSize: '1.125rem', fontWeight: 600, fontFamily: 'inherit' }}>{unit}</Box>
      </Typography>
      <Box sx={{ mt: 2 }}>
        {lines.map((t) => <Typography key={t} sx={{ color: highlight ? vt.onInk2 : vt.text2 }}>{t}</Typography>)}
      </Box>
    </Box>
  );
}

const COMPARE: [string, string, string][] = [
  ['Price', `From ${PRICE} a month for 100 contacts`, 'Free for unlimited members'],
  ['Member roster and custom fields', 'Yes', 'Yes'],
  ['Renewal reminders', 'Yes', 'Yes, sent automatically or by you'],
  ['Online application page', 'Yes', 'Yes, and you approve each applicant'],
  ['Group email to members', 'Yes', 'Yes'],
  ['Online dues payments', 'Yes', 'Link to your own payment page'],
  ['Member website', 'Yes', 'No'],
  ['Event ticketing', 'Yes', 'No'],
];

const INVOLVED = [
  { title: 'The right people for each job', text: `Write a task, and ${BRAND.name} emails the members who fit. Whoever has waited longest goes first.` },
  { title: 'Roles that outlast the person', text: 'Track who holds each position and until when. The next person inherits the notes and open work.' },
  { title: 'Reports you can act on', text: 'See who renews in the next 30, 60 or 90 days, then email them or export the list.' },
];

const QUESTIONS = [
  { q: 'Is it really free?', a: 'Yes. Every feature is included for any number of members. Request access and we set you up.' },
  { q: 'Do our members need to pay dues?', a: 'No. Renewals and dues are off until you turn them on.' },
  { q: `Can members pay dues through ${BRAND.name}?`, a: 'No. Renewal emails link to your own payment page, and you record each payment.' },
  { q: 'Do members need an account?', a: 'No. Each person gets email from you and answers from any phone.' },
  { q: 'Can we take our data with us?', a: 'Yes. Export your roster and tasks whenever you want.' },
];
