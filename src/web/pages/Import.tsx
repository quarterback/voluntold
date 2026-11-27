import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Divider, FormControl, FormControlLabel, InputLabel, Link, ListSubheader, MenuItem, Radio, RadioGroup,
  Select, Stack, Switch, Typography,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/UploadFileOutlined';
import CheckIcon from '@mui/icons-material/CheckCircle';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { peopleWords } from './membership';
import { Help, Page, StatTile, errorText, useDialogs, useLoad } from './common';
import { readFile, type Table as Parsed } from '../importers';
import { dateOrder, guessColumns, guessType, isBookkeeping, isoDate, lastFirstColumn, personFromRow, splitMany, type Target } from '../../shared/importing';
import { FIELD_TYPE_TEXT } from '../format';
import type { Field, FieldType } from '../../shared/types';

interface PreviewRow {
  index: number;
  problem: string | null;
  duplicateOf: { volunteerId: string; name: string; email: string | null; phone: string | null } | null;
  duplicateOfRow: number | null;
}

interface Result { importId: string; added: number; merged: number; setAside: { row: number; reason: string; cells: Record<string, string> }[] }

type Step = 'upload' | 'match' | 'review' | 'done';
const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'match', label: 'Match columns' },
  { key: 'review', label: 'Review' },
];

const MEMBER_TEXT: Record<string, string> = {
  'member:category': 'Membership type',
  'member:since': 'Member since',
  'member:expires': 'Membership expires',
  'member:dues': 'Dues paid',
};
const CONTACT_TEXT: Record<string, string> = { name: 'Full name', first: 'First name', last: 'Last name', email: 'Email', phone: 'Phone' };
const REASON: Record<string, string> = { 'No name': 'No name', 'No email or phone': 'No email or phone' };

/** Where the steps are, and which one this is. */
function StepBar({ step }: { step: Step }) {
  const at = STEPS.findIndex((s) => s.key === step);
  return (
    <Stack direction="row" spacing={1} component="ol" aria-label="Import steps" sx={{ listStyle: 'none', p: 0, m: 0, mb: 2, flexWrap: 'wrap' }} useFlexGap>
      {STEPS.map((s, i) => {
        const done = step === 'done' || i < at;
        const current = i === at;
        return (
          <Box component="li" key={s.key} aria-current={current ? 'step' : undefined}
            sx={(t) => ({ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, height: 32, borderRadius: 999, fontSize: '0.875rem', fontWeight: 600,
              bgcolor: current ? t.vt.ink : 'transparent', color: current ? t.vt.onInk : done ? t.vt.text : t.vt.text3, border: `1.5px solid ${current ? t.vt.ink : t.vt.border}` })}>
            {done ? <CheckIcon sx={{ fontSize: 16 }} /> : <span>{i + 1}</span>}
            {s.label}
          </Box>
        );
      })}
    </Stack>
  );
}

/** The first few things a column holds, so its name doesn't have to explain it. */
function samples(rows: Record<string, string>[], column: string): string {
  const seen: string[] = [];
  for (const r of rows) {
    const v = (r[column] ?? '').trim();
    if (v && !seen.includes(v)) seen.push(v.length > 40 ? `${v.slice(0, 40)}…` : v);
    if (seen.length === 3) break;
  }
  return seen.join(' · ');
}

function targetText(target: Target, fields: Field[]): string {
  if (target in CONTACT_TEXT) return CONTACT_TEXT[target];
  if (target in MEMBER_TEXT) return MEMBER_TEXT[target];
  if (target.startsWith('field:')) return fields.find((f) => f.id === target.slice(6))?.label ?? 'Custom field';
  if (target.startsWith('new:')) return target.slice(4);
  return "Don't import";
}

export function Import() {
  const { path, fields, org, reload: reloadOrg } = useOrg();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const words = peopleWords(org.peopleWord);
  const recent = useLoad(() => api(path('/imports')), [path]);
  // Word, PDF and plain text files need the model that pulls rows out of them.
  const status = useLoad(() => api<{ modelReady: boolean }>(path('/import/status')), [path]);
  const anyFile = status.data?.modelReady === true;
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [table, setTable] = useState<Parsed | null>(null);
  const [map, setMap] = useState<Record<string, Target>>({});
  const [guessed, setGuessed] = useState<Record<string, Target>>({});
  const [showAll, setShowAll] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [choices, setChoices] = useState<Record<number, 'merge' | 'add'>>({});
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = table?.rows ?? [];
  const column = (c: string) => rows.map((r) => r[c] ?? '');
  const nameColumn = Object.keys(map).find((c) => map[c] === 'name');
  const lastFirst = useMemo(() => (nameColumn ? lastFirstColumn(rows.map((r) => r[nameColumn] ?? '')) : false), [nameColumn, rows]);
  const people = useMemo(() => rows.map((r) => personFromRow(r, map, { lastFirst })), [rows, map, lastFirst]);
  const newTypes = useMemo(() => {
    const out: Record<string, FieldType> = {};
    for (const [c, t] of Object.entries(map)) if (t.startsWith('new:')) out[c] = guessType(rows.map((r) => r[c] ?? ''));
    return out;
  }, [map, rows]);

  function reset() {
    setStep('upload');
    setFile(null);
    setTable(null);
    setPreview(null);
    setResult(null);
    setConsent(false);
    setShowAll(false);
    setError(null);
  }

  async function choose(f: File) {
    reset();
    setFile(f);
    setBusy(true);
    try {
      const t = await readFile(f, path);
      if (t.rows.length === 0) throw new Error('No rows found in that file.');
      const first = guessColumns(t.columns, t.rows, fields);
      setTable(t);
      setMap(first);
      setGuessed(first);
      setStep('match');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ rows: PreviewRow[] }>(path('/import/preview'), { body: { rows: people } });
      setPreview(res.rows);
      setChoices(Object.fromEntries(res.rows.filter((r) => r.duplicateOf || r.duplicateOfRow !== null).map((r) => [r.index, 'merge'])));
      setStep('review');
      window.scrollTo(0, 0);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  /** Columns that hold dates, with every cell rewritten as 2026-03-14 so day-first files read right. */
  function withDates(): Record<string, string>[] {
    const dateColumns = Object.entries(map).filter(([c, t]) =>
      ['member:since', 'member:expires', 'member:dues'].includes(t)
      || (t.startsWith('field:') && fields.find((f) => f.id === t.slice(6))?.type === 'date')
      || newTypes[c] === 'date').map(([c]) => c);
    if (dateColumns.length === 0) return rows;
    const order = Object.fromEntries(dateColumns.map((c) => [c, dateOrder(column(c))]));
    return rows.map((r) => ({ ...r, ...Object.fromEntries(dateColumns.map((c) => [c, isoDate(r[c] ?? '', order[c]) ?? r[c] ?? ''])) }));
  }

  async function commit() {
    setBusy(true);
    setError(null);
    try {
      const body = withDates().map((cells, i) => {
        const p = preview![i];
        if (choices[i] === 'merge' && p.duplicateOf) return { cells, action: 'merge', mergeInto: p.duplicateOf.volunteerId };
        if (choices[i] === 'merge' && p.duplicateOfRow !== null) return { cells, action: 'merge', mergeIntoRow: p.duplicateOfRow };
        return { cells, action: 'add' };
      });
      const columnMap = Object.fromEntries(Object.entries(map).filter(([, t]) => t !== 'ignore'));
      setResult(await api<Result>(path('/import/commit'), { body: { fileName: file!.name, fileType: file!.name.split('.').pop(), columnMap, newFieldTypes: newTypes, lastFirst, rows: body, contactConfirmed: consent } }));
      setStep('done');
      window.scrollTo(0, 0);
      reloadOrg();
      recent.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function undo(importId: string) {
    if (!(await dialogs.confirm({ title: 'Undo this import?', confirm: 'Undo import', destructive: true }))) return;
    try {
      const res = await api<{ removed: number; kept: number }>(path(`/imports/${importId}/undo`), { body: {} });
      setError(null);
      if (res.kept > 0) setError(`Removed ${res.removed} · kept ${res.kept} already asked`);
      if (result?.importId === importId) reset();
      reloadOrg();
      recent.reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  function downloadSkipped() {
    if (!result || !table) return;
    const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [[...table.columns, 'Why it was skipped'].map(quote).join(',')];
    for (const s of result.setAside) lines.push([...table.columns.map((c) => s.cells[c] ?? ''), REASON[s.reason] ?? s.reason].map(quote).join(','));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'skipped-rows.csv' });
    a.click();
    URL.revokeObjectURL(url);
  }

  const set = (col: string, target: Target) => {
    // One column each for email, phone and the membership details.
    const single = ['email', 'phone', 'name', 'member:category', 'member:since', 'member:expires', 'member:dues'].includes(target) || target.startsWith('field:');
    const next = { ...map };
    if (single) for (const c of Object.keys(next)) if (next[c] === target) next[c] = 'ignore';
    next[col] = target;
    setMap(next);
    setPreview(null);
  };

  const targets = Object.values(map);
  const hasName = targets.includes('name') || targets.includes('first') || targets.includes('last');
  const hasContact = targets.includes('email') || targets.includes('phone');
  const matched = table?.columns.filter((c) => guessed[c] !== 'ignore') ?? [];
  const others = table?.columns.filter((c) => guessed[c] === 'ignore' && !isBookkeeping(c) && column(c).some(Boolean)) ?? [];
  const leftOut = table?.columns.filter((c) => guessed[c] === 'ignore' && !others.includes(c)) ?? [];

  const dupes = preview?.filter((r) => r.duplicateOf || r.duplicateOfRow !== null) ?? [];
  const problems = preview?.filter((r) => r.problem && !choices[r.index]) ?? [];
  const merging = dupes.filter((d) => choices[d.index] === 'merge').length;
  const adding = rows.length - problems.length - merging;
  const kept = Object.entries(map).filter(([, t]) => !['ignore', 'name', 'first', 'last', 'email', 'phone'].includes(t));
  const sample = preview ? rows.map((_, i) => i).filter((i) => !preview[i].problem && choices[i] !== 'merge').slice(0, 3) : [];

  const mapRow = (col: string) => (
    <Box key={col} sx={{ py: 1.25 }}>
      <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{col}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, overflowWrap: 'anywhere' }}>{samples(rows, col) || 'Empty'}</Typography>
      <FormControl size="small" fullWidth>
        <InputLabel id={`map-${col}`}>Import as</InputLabel>
        <Select labelId={`map-${col}`} label="Import as" value={map[col]} onChange={(e) => set(col, e.target.value)}>
          <ListSubheader>Contact</ListSubheader>
          {Object.entries(CONTACT_TEXT).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          <ListSubheader>Membership</ListSubheader>
          {Object.entries(MEMBER_TEXT).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          <ListSubheader>Your custom fields</ListSubheader>
          {fields.map((f) => <MenuItem key={f.id} value={`field:${f.id}`}>{f.label}</MenuItem>)}
          <MenuItem value={`new:${col}`}>New field: {col}</MenuItem>
          <ListSubheader>Skip</ListSubheader>
          <MenuItem value="ignore">Don't import</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );

  const keepRow = (col: string) => {
    const on = map[col] !== 'ignore';
    return (
      <Box key={col} sx={{ py: 1.25 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{col}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{samples(rows, col) || 'Empty'}</Typography>
          </Box>
          <FormControlLabel labelPlacement="start" label="Keep" sx={{ m: 0, flexShrink: 0 }}
            control={<Switch checked={on} onChange={(e) => set(col, e.target.checked ? `new:${col}` : 'ignore')} slotProps={{ input: { 'aria-label': `Keep ${col}` } }} />} />
        </Stack>
        {on && (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {map[col].startsWith('new:') ? `New field · ${FIELD_TYPE_TEXT[newTypes[col] ?? 'text']}` : targetText(map[col], fields)}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Page title={`Import ${words.people}`} width={760}>
      <StepBar step={step} />
      <Stack spacing={2}>
        {error && <Alert severity={error.startsWith('Removed') ? 'info' : 'error'}>{error}</Alert>}

        {step === 'upload' && (
          <Card>
            <CardContent>
              <Typography variant="h2" component="h2">Upload your list</Typography>
              <Help sx={{ mb: 2 }}>Use a spreadsheet, or the export from the tool you use now. Nothing is saved until you review it.</Help>
              <Button component="label" variant="contained" size="large" startIcon={<UploadIcon />} disabled={busy}>
                Choose file
 <input hidden type="file" accept={anyFile ? '.csv,.tsv,.xlsx,.xls,.xml,.json,.txt,.md,.docx,.pdf,.zip' : '.csv,.tsv,.xlsx,.xls,.xml,.json,.txt,.zip'} onChange={(e) => { if (e.target.files?.[0]) choose(e.target.files[0]); e.target.value = ''; }} />
              </Button>
              {file && busy && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{file.name}, reading…</Typography>}
              <Help sx={{ mt: 2 }}>{anyFile ? 'CSV and Excel work best. Word, PDF, XML, JSON and text files also work.' : 'CSV and Excel work best. XML and JSON files also work.'}</Help>
              <Stack direction="row" spacing={2} sx={{ mt: 1.5 }} useFlexGap>
                <Link href="/sample-list.csv" download variant="body2">Download a sample file</Link>
                <Link component="button" type="button" variant="body2" onClick={() => navigate('../people?add=1', { relative: 'path' })}>Add one person instead</Link>
              </Stack>
            </CardContent>
          </Card>
        )}

        {step === 'match' && table && (
          <>
            <Card>
              <CardContent>
                <Typography variant="h2" component="h2">Match columns</Typography>
                <Help>
                  {file!.name} has {rows.length} {rows.length === 1 ? 'row' : 'rows'} and {table.columns.length} columns. We matched {matched.length}.
                </Help>
                {(table.skippedAbove ?? 0) > 0 && <Help>We skipped {table.skippedAbove} title {table.skippedAbove === 1 ? 'row' : 'rows'} above the column names.</Help>}
                {table.via === 'model' && <Alert severity="info" sx={{ mt: 1.5 }}>Extracted with AI{table.notes ? `: ${table.notes}` : ''}</Alert>}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h3" component="h3">Matched</Typography>
                <Help>Check each match. Change any that are wrong.</Help>
                <Stack divider={<Divider />}>{matched.map(mapRow)}</Stack>
                {matched.length === 0 && <Typography variant="body2" sx={{ mt: 1 }}>No columns matched</Typography>}
              </CardContent>
            </Card>

            {others.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h3" component="h3">Other columns</Typography>
                  <Help>Switch on any you want to keep. Each one becomes a custom field.</Help>
                  <Stack divider={<Divider />}>{others.map((c) => (map[c] !== 'ignore' && !map[c].startsWith('new:') ? mapRow(c) : keepRow(c)))}</Stack>
                </CardContent>
              </Card>
            )}

            {leftOut.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h3" component="h3">Left out</Typography>
                  <Help>Record numbers, timestamps and empty columns from the other tool.</Help>
                  {showAll
                    ? <Stack divider={<Divider />}>{leftOut.map(mapRow)}</Stack>
                    : <Button sx={{ mt: 1 }} onClick={() => setShowAll(true)}>Show {leftOut.length} columns</Button>}
                </CardContent>
              </Card>
            )}

            {!hasName && <Alert severity="warning">Choose the column that holds names</Alert>}
            {hasName && !hasContact && <Alert severity="warning">Choose an email or phone column</Alert>}
            <Stack direction="row" spacing={1}>
              <Button onClick={reset}>Back</Button>
              <Button variant="contained" size="large" disabled={busy || !hasName || !hasContact} onClick={check}>Next</Button>
            </Stack>
          </>
        )}

        {step === 'review' && preview && table && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.5 }}>
              <StatTile label="New" value={adding} tone="lime" />
              <StatTile label="Merged" value={merging} />
              <StatTile label="Skipped" value={problems.length} />
            </Box>

            {sample.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h2" component="h2">Preview</Typography>
                  <Help>The first {sample.length === 1 ? 'person' : `${sample.length} people`}, as they'll be saved.</Help>
                  <Stack divider={<Divider />}>
                    {sample.map((i) => (
                      <Box key={i} sx={{ py: 1.25 }}>
                        <Typography sx={{ fontWeight: 600 }}>{people[i].name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{[people[i].email, people[i].phone].filter(Boolean).join(' · ')}</Typography>
                        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.75 }}>
                          {kept.filter(([c]) => rows[i][c]).map(([c, t]) => {
                            const many = newTypes[c] === 'many' || fields.find((f) => `field:${f.id}` === t)?.type === 'many';
                            const value = many ? splitMany(rows[i][c]).join(', ') : rows[i][c];
                            return <Chip key={c} size="small" label={`${targetText(t, fields)}: ${value.length > 48 ? `${value.slice(0, 48)}…` : value}`} sx={{ maxWidth: '100%' }} />;
                          })}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {dupes.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h2" component="h2">Possible duplicates</Typography>
                  <Help>Same email or phone. Merging keeps one person and adds any new details.</Help>
                  <Stack divider={<Divider />}>
                    {dupes.map((d) => {
                      const other = d.duplicateOf ? `${d.duplicateOf.name}, already saved` : `${people[d.duplicateOfRow!].name}, earlier in this file`;
                      return (
                        <Box key={d.index} sx={{ py: 1.25 }}>
                          <Typography><strong>{people[d.index].name}</strong> and <strong>{other}</strong></Typography>
                          <RadioGroup row value={choices[d.index]} onChange={(e) => setChoices({ ...choices, [d.index]: e.target.value as 'merge' | 'add' })}>
                            <FormControlLabel value="merge" control={<Radio />} label="Merge" />
                            <FormControlLabel value="add" control={<Radio />} label="Keep both" />
                          </RadioGroup>
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {problems.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h2" component="h2">Skipped rows</Typography>
                  <Help>Each person needs a name and an email or phone, so they can be asked.</Help>
                  <Stack sx={{ mt: 1 }} spacing={0.5}>
                    {problems.slice(0, 8).map((p) => (
                      <Typography key={p.index} variant="body2">{people[p.index].name || `Row ${p.index + 2 + (table.skippedAbove ?? 0)}`} · {REASON[p.problem!] ?? p.problem}</Typography>
                    ))}
                    {problems.length > 8 && <Typography variant="body2" color="text.secondary">And {problems.length - 8} more</Typography>}
                  </Stack>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <FormControlLabel control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />} label="These people agreed to be contacted by us" />
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button onClick={() => setStep('match')}>Back</Button>
                  <Button variant="contained" size="large" disabled={busy || !consent || adding + merging === 0} onClick={commit}>Import {adding + merging} people</Button>
                </Stack>
              </CardContent>
            </Card>
          </>
        )}

        {step === 'done' && result && (
          <Card>
            <CardContent>
              <Typography variant="h2" component="h2">Import finished</Typography>
              <Typography sx={{ mt: 0.5 }}>Added {result.added} · merged {result.merged}{result.setAside.length ? ` · skipped ${result.setAside.length}` : ''}</Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 2, flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={() => navigate('../people', { relative: 'path' })}>View people</Button>
                <Button variant="outlined" onClick={reset}>Import another file</Button>
                {result.setAside.length > 0 && <Button onClick={downloadSkipped}>Download skipped rows</Button>}
                {result.added > 0 && <Button color="error" onClick={() => undo(result.importId)}>Undo import</Button>}
              </Stack>
            </CardContent>
          </Card>
        )}

        {step === 'upload' && recent.data?.imports?.length > 0 && (
          <Box>
            <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Import history</Typography>
            <Stack spacing={1}>
              {recent.data.imports.map((imp: any) => (
                <Card key={imp.id}>
                  <CardContent>
                    <Typography sx={{ overflowWrap: 'anywhere' }}>{imp.file_name}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {imp.undone_at ? 'Undone' : `Added ${imp.added} · merged ${imp.merged}`} · {new Date(imp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Typography>
                    {imp.set_aside.length > 0 && (
                      <Typography color="text.secondary" variant="body2">Skipped: {imp.set_aside.map((s: any) => `${Object.values(s.cells).filter(Boolean).slice(0, 2).join(' ') || `row ${s.row + 2}`} (${s.reason.toLowerCase()})`).join('; ')}</Typography>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      {imp.set_aside.length > 0 && <Button size="small" onClick={() => api(path(`/imports/${imp.id}/clear`), { body: {} }).then(recent.reload)}>Clear</Button>}
                      {!imp.undone_at && imp.people > 0 && <Button size="small" color="error" onClick={() => undo(imp.id)}>Undo import</Button>}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Page>
  );
}
