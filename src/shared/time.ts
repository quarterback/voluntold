// Dates and times in the interface follow Adobe's grammar rules: lowercase
// am and pm with no space, and no ":00" on whole hours ("12pm", "12:30pm").

function parts(ms: number, timeZone?: string) {
  const f = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { hour: p.hour, minute: p.minute, period: (p.dayPeriod ?? '').toLowerCase() };
}

export function time(ms: number, timeZone?: string): string {
  const { hour, minute, period } = parts(ms, timeZone);
  return `${hour}${minute === '00' ? '' : `:${minute}`}${period}`;
}

/** "12pm to 2pm", or "11:30am to 1pm". Drops the first period when both match: "10 to 11:30am". */
export function timeRange(start: number, end: number, timeZone?: string): string {
  const a = parts(start, timeZone);
  const b = parts(end, timeZone);
  const first = `${a.hour}${a.minute === '00' ? '' : `:${a.minute}`}${a.period === b.period ? '' : a.period}`;
  return `${first} to ${time(end, timeZone)}`;
}

export function day(ms: number, timeZone?: string, long = false): string {
  return new Date(ms).toLocaleDateString('en-US', { weekday: long ? 'long' : 'short', month: 'short', day: 'numeric', timeZone });
}
