import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Wordmark } from '../Wordmark';
import { FONT_DISPLAY } from '../theme';
import { BROWSER_DEMO } from '../demoMode';
import { BRAND } from '../../shared/brand';

// Landing pages for search and ads: people comparing ManyArms with a tool
// they pay for. The home page doesn't link here, so it stays free of
// competitor names. Claims about each competitor come from its own website.

interface Competitor {
  name: string;
  /** Lines under the headline. */
  intro: string[];
  costHeading: string;
  price: { price: string; unit: string; lines: string[] };
  ours: { price: string; unit: string; lines: string[] };
  compare: [string, string, string][];
  migrate: string[];
}

/** One comparison page. Each competitor's words live in COMPETITORS below. */
export function Alternative({ id }: { id: keyof typeof COMPETITORS }) {
  const c = COMPETITORS[id];
  const navigate = useNavigate();
  const { vt } = useTheme();

  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    document.title = `The free ${c.name} alternative | ${BRAND.name}`;
    fetch('/api/me', { credentials: 'same-origin' }).then((r) => setSignedIn(r.ok)).catch(() => {});
    return () => { document.title = `${BRAND.name}: ${BRAND.tagline}`; };
  }, [c.name]);

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
              The free <Box component="em" sx={{ fontStyle: 'italic', color: vt.tangerine }}>{c.name}</Box> alternative
            </Typography>
            {c.intro.map((t, i) => (
              <Typography key={t} sx={{ fontSize: { xs: '1.0625rem', md: '1.25rem' }, color: vt.onInk2, maxWidth: 620, mb: i === c.intro.length - 1 ? 4 : 1.5 }}>{t}</Typography>
            ))}
            {buttons}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" component="main" sx={{ pt: { xs: 8, md: 12 } }}>
        <Box sx={section}>
          <Typography component="h2" sx={h2}>{c.costHeading}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, maxWidth: 900 }}>
            <PriceCard name={c.name} {...c.price} />
            <PriceCard name={BRAND.name} {...c.ours} highlight />
          </Box>
        </Box>

        <Box sx={{ ...section, maxWidth: 900 }}>
          <Typography component="h2" sx={h2}>How they compare</Typography>
          <TableContainer sx={{ ...frame, boxShadow: 'none', border: `1px solid ${vt.border}` }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell sx={{ fontWeight: 700 }}>{c.name}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{BRAND.name}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {c.compare.map(([what, them, us]) => (
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

        <Box sx={{ ...section, maxWidth: 760 }}>
          <Typography component="h2" sx={h2}>Moving from {c.name}</Typography>
          <Box component="ol" sx={{ pl: 3, m: 0, '& li': { mb: 1.5, color: vt.text2, fontSize: '1.0625rem' } }}>
            {c.migrate.map((t) => <li key={t}>{t}</li>)}
          </Box>
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

const FREE = { price: '$0', unit: 'a month' };

export const COMPETITORS = {
  // Price from wildapricot.com/pricing, checked November 27, 2026.
  wildapricot: {
    name: 'WildApricot',
    intro: ['Keep your roster, renewals, roles and member email in one place.', `${BRAND.name} is free for any number of members. Your bill stays at zero as you grow.`],
    costHeading: 'What a growing list costs',
    price: { price: '$66', unit: 'a month', lines: ['For up to 100 contacts, billed monthly.', 'The price goes up as your contact count grows.'] },
    ours: { ...FREE, lines: ['For any number of members.', 'Every feature is included.'] },
    compare: [
      ['Price', '$66 a month for 100 contacts', 'Free'],
      ['As your list grows', 'Price goes up with every tier', 'Still free'],
      ['Member roster and custom fields', 'Yes', 'Yes'],
      ['Renewal reminders', 'Yes', 'Automatic or one click'],
      ['Application page', 'Yes', 'Yes, you approve each applicant'],
      ['Group email', 'Yes', 'Yes'],
      ['Volunteer asks', 'Through event registration', 'Sent to the people who fit, longest wait first'],
      ['Roles with terms and handoffs', 'No', 'Yes'],
      ['Members answer without logging in', 'No', 'Yes'],
    ],
    migrate: [
      'Export your contacts from WildApricot as a CSV file.',
      `Import the file into ${BRAND.name}. It recognizes columns such as Membership level, Renewal due and Member since.`,
      'Check the matches, then add your board, committees and roles.',
    ],
  },
  // From galaxydigital.com, checked November 27, 2026: quote-based pricing
  // after a demo, volunteers sign up by creating a profile, and no
  // membership renewals, dues or board terms on its product pages.
  galaxy: {
    name: 'Galaxy Digital',
    intro: ['Run your volunteers and your members from one roster.', `${BRAND.name} is free. Request access today and skip the sales demo.`],
    costHeading: 'What it takes to start',
    price: { price: 'Quote', unit: '', lines: ['Custom price after a sales demo.', 'No price on the website.'] },
    ours: { ...FREE, lines: ['For any number of people.', 'Request access and start today.'] },
    compare: [
      ['Price', 'Custom quote', 'Free'],
      ['Getting started', 'Book a sales demo', 'Request access online'],
      ['Volunteer tasks and shifts', 'Yes', 'Yes'],
      ['Group email', 'Yes', 'Yes'],
      ['How volunteers sign up', 'Create a profile and log in', 'Tap Accept in an email'],
      ['Who gets asked', 'Whoever finds the listing', 'The people who fit, longest wait first'],
      ['Membership renewals and dues', 'No', 'Yes'],
      ['Board and committee roles with terms', 'No', 'Yes'],
    ],
    migrate: [
      'Export your volunteer list from Galaxy Digital as a CSV file.',
      `Import the file into ${BRAND.name}. It matches names, email, phone and your own fields.`,
      'Add your roles, then write your first task.',
    ],
  },
} satisfies Record<string, Competitor>;
