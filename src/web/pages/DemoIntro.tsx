import { Box, Link, Typography } from '@mui/material';
import { BROWSER_DEMO } from '../demoMode';

// The top of the sample picker, where the demo starts (docs/specs/demo.md).
// Like the home page and the guide, it's prose by design.
export function DemoIntro() {
  const steps = [
    'Pick the sample closest to your organization.',
    'A guide opens beside the screens and walks you through each feature.',
    BROWSER_DEMO ? 'Change anything. It all stays in this browser until you start over.' : 'Change anything. The changes stay in your copy.',
  ];
  return (
    <Box sx={{ mb: 5 }}>
      <Typography variant="h1" component="h1" sx={{ mb: 1.5 }}>Try Volley with sample data</Typography>
      <Typography sx={{ mb: 2, fontSize: '1.0625rem' }}>Volley is a volunteer activation tool. This demo shows every feature on a sample organization.</Typography>
      <Box component="ol" sx={{ pl: 2.5, m: 0, mb: 2, '& li': { mb: 0.75 } }}>
        {steps.map((s) => <Typography key={s} component="li">{s}</Typography>)}
      </Box>
      <Typography color="text.secondary">
        Each stop ends with a question about your organization. Send us your answers at <Link href="mailto:hello@vloora.com?subject=Volley%20demo">hello@vloora.com</Link>.
      </Typography>
    </Box>
  );
}
