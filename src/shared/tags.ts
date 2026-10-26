// Tags sort tasks, needs and people at a glance (next version spec, section 3).
// A tag gets one color from this palette when it's created and keeps it.
// Color only helps: the tag's name carries the meaning.

export const TAG_COLORS = ['red', 'orange', 'amber', 'green', 'teal', 'blue', 'indigo', 'violet', 'pink', 'brown', 'gray', 'lime'] as const;
export type TagColor = (typeof TAG_COLORS)[number];

/** Background and text for each color, in light and dark mode. */
export const TAG_SWATCH: Record<TagColor, { light: [string, string]; dark: [string, string] }> = {
  red: { light: ['#FDE8E8', '#9B1C1C'], dark: ['#4A1D1D', '#F8B4B4'] },
  orange: { light: ['#FEECDC', '#8A3A0B'], dark: ['#4A2A14', '#FDBA8C'] },
  amber: { light: ['#FDF3C4', '#723B13'], dark: ['#4A3B10', '#FCE96A'] },
  green: { light: ['#DEF7EC', '#03543F'], dark: ['#0F3B2E', '#84E1BC'] },
  teal: { light: ['#D5F5F6', '#05505C'], dark: ['#0F3A3F', '#7EDCE2'] },
  blue: { light: ['#E0F2FE', '#0C4A6E'], dark: ['#0C3447', '#7DD3FC'] },
  indigo: { light: ['#E5EDFF', '#42389D'], dark: ['#2A2466', '#B4C6FC'] },
  violet: { light: ['#EDEBFE', '#5521B5'], dark: ['#35215E', '#CABFFD'] },
  pink: { light: ['#FCE8F3', '#99154B'], dark: ['#4A1A33', '#F8B4D9'] },
  brown: { light: ['#F3E8DC', '#6B3F1D'], dark: ['#3D2A1A', '#D9B38C'] },
  gray: { light: ['#E5E7EB', '#374151'], dark: ['#374151', '#D1D5DB'] },
  lime: { light: ['#ECFCCB', '#3F6212'], dark: ['#27391A', '#BEF264'] },
};

export const TAG_NAME_MAX = 40;
export const TAGS_PER_ORG_MAX = 200;

/** One space between words, trimmed, and no longer than the limit. */
export function cleanTagName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, TAG_NAME_MAX);
}

/** Two names are the same tag when they differ only in case or spacing. */
export function tagKey(name: string): string {
  return cleanTagName(name).toLowerCase();
}

/** The palette color used least so far. Ties go in palette order. */
export function nextTagColor(used: TagColor[]): TagColor {
  const counts = new Map<TagColor, number>(TAG_COLORS.map((c) => [c, 0]));
  for (const c of used) if (counts.has(c)) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best: TagColor = TAG_COLORS[0];
  for (const c of TAG_COLORS) if ((counts.get(c) ?? 0) < (counts.get(best) ?? 0)) best = c;
  return best;
}
