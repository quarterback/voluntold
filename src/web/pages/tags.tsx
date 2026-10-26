// Tags on screen: a colored chip, a row of them, and the picker that changes
// the tags on one record. Color only helps; the name carries the meaning
// (next version spec, rule 5).

import { useState } from 'react';
import { Box, Button, Divider, MenuItem, Select, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { errorText, useDialogs } from './common';
import { TAG_SWATCH } from '../../shared/tags';
import type { Tag } from '../../shared/types';

export function TagChip({ tag, size = 'small', onDelete, onClick, selected, grow }: {
  tag: Tag;
  size?: 'small' | 'medium';
  onDelete?: () => void;
  onClick?: () => void;
  /** Dimmed when a filter is on and this tag isn't the one picked. */
  selected?: boolean;
  grow?: boolean;
}) {
  const theme = useTheme();
  const [bg, fg] = TAG_SWATCH[tag.color]?.[theme.palette.mode] ?? TAG_SWATCH.gray[theme.palette.mode];
  const dim = selected === false;
  const clickable = Boolean(onClick);
  return (
    <Box
      component={clickable ? 'button' : 'span'}
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={clickable && selected !== undefined ? selected : undefined}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5, height: size === 'small' ? 22 : 28, px: size === 'small' ? 1 : 1.25, borderRadius: 1.5,
        bgcolor: bg, color: fg, fontSize: size === 'small' ? '0.75rem' : '0.8125rem', fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap',
        border: 'none', fontFamily: 'inherit', cursor: clickable ? 'pointer' : 'default', opacity: dim ? 0.45 : 1,
        outline: selected ? `2px solid ${fg}` : 'none', outlineOffset: 1, flexGrow: grow ? 1 : 0, maxWidth: '100%',
      }}
    >
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tag.name}</Box>
      {tag.isNew && <Box component="span" sx={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85 }}>New</Box>}
      {onDelete && (
        <Box component="button" type="button" aria-label={`Remove ${tag.name}`} onClick={(e) => { e.stopPropagation(); onDelete(); }}
          sx={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', ml: 0.25, width: 14, height: 14, borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', lineHeight: 1, '&:hover': { bgcolor: 'rgba(0,0,0,0.12)' } }}>
          ×
        </Box>
      )}
    </Box>
  );
}

/** The tags on a record, by id, in the order the organization's set lists them. */
export function TagRow({ tagIds, max = 4, sx }: { tagIds: string[]; max?: number; sx?: object }) {
  const { tags } = useOrg();
  const shown = tags.filter((t) => tagIds.includes(t.id));
  if (shown.length === 0) return null;
  return (
    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', ...sx }}>
      {shown.slice(0, max).map((t) => <TagChip key={t.id} tag={t} />)}
      {shown.length > max && <Typography variant="caption">+{shown.length - max}</Typography>}
    </Stack>
  );
}

/**
 * Changes the tags on one record. Removing is one tap on the chip, adding is
 * one pick from the list. "New tag" makes one and puts it on.
 */
export function TagPicker({ kind, id, tagIds, onChanged, disabled }: {
  kind: 'volunteers' | 'tasks' | 'needs';
  id: string;
  tagIds: string[];
  onChanged: (tagIds: string[]) => void;
  disabled?: boolean;
}) {
  const { tags, path, reload } = useOrg();
  const dialogs = useDialogs();
  const [problem, setProblem] = useState<string | null>(null);
  const current = tags.filter((t) => tagIds.includes(t.id));
  const rest = tags.filter((t) => !tagIds.includes(t.id));

  async function save(next: string[], create?: string) {
    setProblem(null);
    try {
      const res = await api(path(`/${kind}/${id}/tags`), { method: 'PUT', body: { tagIds: next, create: create ? [create] : [] } });
      onChanged(res.tagIds);
      if (create) await reload();
    } catch (e) {
      setProblem(errorText(e));
    }
  }

  async function pick(value: string) {
    if (value === '__new') {
      const name = await dialogs.prompt({ title: 'New tag', label: 'Tag name', confirm: 'Add tag' });
      if (name) await save(tagIds, name);
      return;
    }
    if (value) await save([...tagIds, value]);
  }

  return (
    <Box>
      <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        {current.map((t) => <TagChip key={t.id} tag={t} size="medium" onDelete={disabled ? undefined : () => save(tagIds.filter((x) => x !== t.id))} />)}
        {!disabled && (
          <Select value="" displayEmpty size="small" onChange={(e) => pick(e.target.value)} inputProps={{ 'aria-label': 'Add tag' }}
            renderValue={() => 'Add tag'} sx={{ height: 28, minWidth: 110, fontSize: '0.8125rem', '& .MuiSelect-select': { py: 0 } }}>
            {rest.map((t) => <MenuItem key={t.id} value={t.id}><TagChip tag={t} /></MenuItem>)}
            {rest.length > 0 && <Divider />}
            <MenuItem value="__new">New tag</MenuItem>
          </Select>
        )}
      </Stack>
      {problem && <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>{problem}</Typography>}
    </Box>
  );
}

/** Filter chips: every tag in the set, with a count, one selected at a time. */
export function TagFilter({ value, counts, onChange }: { value: string; counts: Map<string, number>; onChange: (tagId: string) => void }) {
  const { tags } = useOrg();
  if (tags.length === 0) return null;
  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
      {tags.map((t) => (
        <TagChip key={t.id} tag={{ ...t, name: `${t.name} ${counts.get(t.id) ?? 0}` }} selected={value ? value === t.id : undefined} onClick={() => onChange(value === t.id ? '' : t.id)} />
      ))}
      {value && <Button size="small" onClick={() => onChange('')}>Clear</Button>}
    </Stack>
  );
}
