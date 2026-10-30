// The sample organizations a person can open in the demo (docs/specs/demo.md).
// Names and people are made up and use example.com addresses.

export interface SampleKind {
  kind: string;
  name: string;
  sector: string;
  blurb: string;
}

export const SAMPLE_KINDS: SampleKind[] = [
  { kind: 'pantry', name: 'Eastside Pantry', sector: 'Food pantry', blurb: 'A neighborhood pantry with a Saturday distribution, grocery pickups and a new delivery route.' },
  { kind: 'membership', name: 'Riverbend Design Alliance', sector: 'Nonprofit membership organization', blurb: 'A professional association whose members staff its conference, mentoring program and chapter meetings.' },
  { kind: 'radio', name: 'Riverside Community Radio', sector: 'Community radio station', blurb: 'An all-volunteer station: hosts, board operators, the music library, engineering and the pledge drive.' },
  { kind: 'youth', name: 'Northgate Youth Collective', sector: 'Youth nonprofit', blurb: 'Tutoring, a Saturday soccer program, field trips and a winter camp, where background checks decide who can be asked.' },
  { kind: 'disaster', name: 'Cascade Surge Response', sector: 'Disaster response company', blurb: 'A company that mobilizes a trained volunteer pool within hours of a flood, fire or storm.' },
  { kind: 'events', name: 'Bright Line Event Crew', sector: 'Events staffing company', blurb: 'A company that staffs festivals, races and conferences with a volunteer crew.' },
];

export const sampleKind = (kind: string | null | undefined) => SAMPLE_KINDS.find((k) => k.kind === kind) ?? null;
