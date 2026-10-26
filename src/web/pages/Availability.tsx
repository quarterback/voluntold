import { Box, Chip, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { DAY_TEXT, PART_TEXT } from '../format';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const PARTS = ['am', 'pm', 'eve'];
const PART_SHORT: Record<string, string> = { am: 'AM', pm: 'PM', eve: 'Eve' };

export interface Avail {
  hoursWeek: number | null;
  days: string[];
  remoteOk: boolean;
}

/** Usual times as a grid of days by morning, afternoon and evening, plus hours and remote. */
export function AvailabilityFields({ value, onChange, disabled }: { value: Avail; onChange: (v: Avail) => void; disabled?: boolean }) {
  const toggle = (slot: string) =>
    onChange({ ...value, days: value.days.includes(slot) ? value.days.filter((d) => d !== slot) : [...value.days, slot] });
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end' }}>
        <TextField label="Hours a week" type="number" value={value.hoursWeek ?? ''} disabled={disabled}
          onChange={(e) => onChange({ ...value, hoursWeek: e.target.value === '' ? null : Number(e.target.value) })}
          slotProps={{ htmlInput: { min: 0, max: 80 } }} sx={{ width: 150, flexShrink: 0 }} />
        <FormControlLabel control={<Switch checked={value.remoteOk} disabled={disabled} onChange={(e) => onChange({ ...value, remoteOk: e.target.checked })} />} label="Remote is fine" sx={{ mb: 0.5 }} />
      </Stack>
      <Box>
        <Typography component="p" sx={{ fontSize: '0.8125rem', fontWeight: 500, mb: 0.75 }}>Usual times</Typography>
        <Box role="group" aria-label="Usual times" sx={{ display: 'grid', gridTemplateColumns: '40px repeat(3, minmax(0, 1fr))', gap: 0.75, alignItems: 'center', maxWidth: 360 }}>
          <span />
          {PARTS.map((p) => <Typography key={p} variant="caption" sx={{ textAlign: 'center' }}>{PART_SHORT[p]}</Typography>)}
          {DAYS.map((d) => (
            <Box key={d} sx={{ display: 'contents' }}>
              <Typography variant="body2" color="text.secondary">{DAY_TEXT[d]}</Typography>
              {PARTS.map((p) => {
                const slot = `${d}_${p}`;
                const on = value.days.includes(slot);
                return (
                  <Chip key={slot} label={on ? 'Yes' : ' '} size="small" disabled={disabled} color={on ? 'primary' : 'default'} onClick={() => toggle(slot)}
                    aria-label={`${DAY_TEXT[d]} ${PART_TEXT[p]}`} aria-pressed={on} sx={{ width: '100%' }} />
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    </Stack>
  );
}
