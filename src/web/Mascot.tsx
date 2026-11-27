import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * The setup helper's face: a round head with five arms, lime on ink. It is a
 * placeholder drawing for the owner to replace or approve. It stands beside
 * scripted help, not a chatbot, and it is decoration: the words carry the meaning.
 */
export function Mascot({ size = 44 }: { size?: number }) {
  const { vt } = useTheme();
  return (
    <Box aria-hidden sx={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', bgcolor: vt.ink, display: 'grid', placeItems: 'center' }}>
      <svg viewBox="0 0 48 48" width={size * 0.78} height={size * 0.78}>
        <g stroke={vt.lime} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M12 26 Q6 34 8 42" />
          <path d="M18 30 Q15 38 17 45" />
          <path d="M24 31 V46" />
          <path d="M30 30 Q33 38 31 45" />
          <path d="M36 26 Q42 34 40 42" />
        </g>
        <circle cx="24" cy="19" r="14" fill={vt.lime} />
        <circle cx="19" cy="18" r="2.6" fill={vt.ink} />
        <circle cx="29" cy="18" r="2.6" fill={vt.ink} />
        <path d="M20 24 Q24 27 28 24" stroke={vt.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </Box>
  );
}
