import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Radio, RadioGroup, Select,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/UploadFileOutlined';
import { api } from '../api';
import { useOrg } from './OrgShell';
import { Page, errorText, useLoad } from './common';
import { readFile, type Table as Parsed } from '../importers';

type Target = string; // name | email | phone | ignore | field:<id> | new:<label>

interface PreviewRow {
  index: number;
  problem: string | null;
  duplicateOf: { volunteerId: string; name: string; email: string | null; phone: string | null } | null;
  duplicateOfRow: number | null;
}

function guess(column: string, fields: ReturnType<typeof useOrg>['fields'], rows: Record<string, string>[]): Target {
  const c = column.toLowerCase().replace(/[^a-z]/g, '');
  if (['name', 'fullname', 'volunteer', 'volunteername', 'firstname', 'lastname', 'surname', 'givenname', 'familyname'].includes(c)) return 'name';
  if (c.includes('email') || c === 'mail') return 'email';
  if (['phone', 'mobile', 'cell', 'tel', 'telephone', 'phonenumber', 'cellphone', 'mobilephone'].includes(c)) return 'phone';
  if (['id', 'uid', 'rowid', 'recordid', 'timestamp', 'createdat', 'updatedat'].includes(c)) return 'ignore';
  // "skill" matches a field called "Skills", and the other way round.
  const singular = (s: string) => s.replace(/s$/, '');
  const field = fields.find((f) => singular(f.label.toLowerCase().replace(/[^a-z]/g, '')) === singular(c));
  if (field) return `field:${field.id}`;
  return rows.some((r) => r[column]?.trim()) ? `new:${column}` : 'ignore';
}

export function Import() {
  const { path, fields, reload: reloadOrg } = useOrg();
  const navigate = useNavigate();
  const recent = useLoad(() => api(path('/imports')), [path]);
  const [file, setFile] = useState<File | null>(null);
  const [table, setTable] = useState<Parsed | null>(null);
  const [map, setMap] = useState<Record<string, Target>>({});
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [choices, setChoices] = useState<Record<number, 'merge' | 'add'>>({});
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<{ added: number; merged: number; setAside: { row: number; reason: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function choose(f: File) {
    setFile(f);
    setTable(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setBusy(true);
    try {
      const t = await readFile(f, path);
      if (t.rows.length === 0) throw new Error('No rows found in that file.');
      setTable(t);
      setMap(Object.fromEntries(t.columns.map((c) => [c, guess(c, fields, t.rows)])));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const joined = (row: Record<string, string>, target: string) =>
    Object.entries(map).filter(([, t]) => t === target).map(([c]) => row[c]).filter(Boolean).join(' ');

  async function check() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ rows: PreviewRow[] }>(path('/import/preview'), {
        body: { rows: table!.rows.map((r) => ({ name: joined(r, 'name'), email: joined(r, 'email'), phone: joined(r, 'phone') })) },
      });
      setPreview(res.rows);
      setChoices(Object.fromEntries(res.rows.filter((r) => r.duplicateOf || r.duplicateOfRow !== null).map((r) => [r.index, 'merge'])));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    setBusy(true);
    setError(null);
    try {
      const rows = table!.rows.map((cells, i) => {
        const p = preview![i];
        if (choices[i] === 'merge' && p.duplicateOf) return { cells, action: 'merge', mergeInto: p.duplicateOf.volunteerId };
        if (choices[i] === 'merge' && p.duplicateOfRow !== null) return { cells, action: 'merge', mergeIntoRow: p.duplicateOfRow };
        return { cells, action: 'add' };
      });
      const columnMap = Object.fromEntries(Object.entries(map).filter(([, t]) => t !== 'ignore'));
      setResult(await api(path('/import/commit'), { body: { fileName: file!.name, fileType: file!.name.split('.').pop(), columnMap, rows, contactConfirmed: consent } }));
      reloadOrg();
      recent.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const hasName = Object.values(map).includes('name');
  const dupes = preview?.filter((r) => r.duplicateOf || r.duplicateOfRow !== null) ?? [];
  const problems = preview?.filter((r) => r.problem && !choices[r.index]) ?? [];
  const showRows = table?.rows.slice(0, 10) ?? [];

  return (
    <Page title="Import">
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        {!result && (
          <Card>
            <CardContent>
              <Typography sx={{ mb: 2 }}>
                CSV, Excel (.xlsx), XML, JSON, text, Word (.docx) or PDF. Nothing saves until you confirm.
              </Typography>
              <Button component="label" variant="contained" startIcon={<UploadIcon />} disabled={busy}>
                {file ? 'Choose another file' : 'Choose file'}
                <input hidden type="file" accept=".csv,.tsv,.xlsx,.xml,.json,.txt,.md,.docx,.pdf" onChange={(e) => e.target.files?.[0] && choose(e.target.files[0])} />
              </Button>
              {file && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{file.name}{busy && !table ? ', reading…' : ''}</Typography>}
            </CardContent>
          </Card>
        )}

        {table && !result && (
          <Card>
            <CardContent>
              <Typography variant="h2" component="h2" gutterBottom>Match columns</Typography>
              {table.via === 'model' && (
                <Alert severity="info" sx={{ mb: 2 }}>A model read this file. Check every row.{table.notes ? ` Notes: ${table.notes}` : ''}</Alert>
              )}
              <Stack spacing={1} sx={{ mb: 1.5 }}>
                {table.columns.map((col) => (
                  <Stack key={col} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ width: '40%', flexShrink: 0, overflowWrap: 'anywhere' }}><strong>{col}</strong></Typography>
                    <FormControl size="small" fullWidth>
                      <InputLabel id={`map-${col}`}>Goes to</InputLabel>
                      <Select labelId={`map-${col}`} label="Goes to" value={map[col]} onChange={(e) => { setMap({ ...map, [col]: e.target.value }); setPreview(null); }}>
                        <MenuItem value="name">Name</MenuItem>
                        <MenuItem value="email">Email</MenuItem>
                        <MenuItem value="phone">Phone</MenuItem>
                        {fields.map((f) => <MenuItem key={f.id} value={`field:${f.id}`}>{f.label}</MenuItem>)}
                        <MenuItem value={`new:${col}`}>New detail: {col}</MenuItem>
                        <MenuItem value="ignore">Skip</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                ))}
              </Stack>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>First {showRows.length} of {table.rows.length} rows</Typography>
              <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto', mb: 2 }}>
                <Table size="small">
                  <TableHead><TableRow>{table.columns.map((c) => <TableCell key={c}>{c}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {showRows.map((r, i) => <TableRow key={i}>{table.columns.map((c) => <TableCell key={c}>{r[c]}</TableCell>)}</TableRow>)}
                  </TableBody>
                </Table>
              </TableContainer>
              {!hasName && <Alert severity="warning" sx={{ mb: 2 }}>Pick the name column.</Alert>}
              {!preview && <Button variant="contained" disabled={busy || !hasName} onClick={check}>Check duplicates</Button>}
            </CardContent>
          </Card>
        )}

        {preview && !result && (
          <Card>
            <CardContent>
              <Typography variant="h2" component="h2" gutterBottom>Review</Typography>
              {dupes.length === 0 ? <Typography variant="body2" sx={{ mb: 1.5 }}>No duplicates found.</Typography> : (
                <Stack spacing={2} sx={{ mb: 2 }}>
                  <Typography variant="body2">Same email or phone:</Typography>
                  {dupes.map((d) => {
                    const row = table!.rows[d.index];
                    const other = d.duplicateOf ? `${d.duplicateOf.name} (already saved)` : `${joined(table!.rows[d.duplicateOfRow!], 'name')} (row ${d.duplicateOfRow! + 2} of this file)`;
                    return (
                      <Box key={d.index}>
                        <Typography><strong>{joined(row, 'name')}</strong> and <strong>{other}</strong></Typography>
                        <RadioGroup row value={choices[d.index]} onChange={(e) => setChoices({ ...choices, [d.index]: e.target.value as 'merge' | 'add' })}>
                          <FormControlLabel value="merge" control={<Radio />} label="Merge" />
                          <FormControlLabel value="add" control={<Radio />} label="Keep both" />
                        </RadioGroup>
                      </Box>
                    );
                  })}
                </Stack>
              )}
              {problems.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {problems.length} set aside, no email or phone: {problems.slice(0, 5).map((p) => joined(table!.rows[p.index], 'name') || `row ${p.index + 2}`).join(', ')}{problems.length > 5 ? ', …' : ''}
                </Alert>
              )}
              <FormControlLabel control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />} label="They agreed to be contacted" />
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" disabled={busy || !consent} onClick={commit}>Import {table!.rows.length - problems.length}</Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {result && (
          <Alert severity="success" action={
            <Stack direction="row" spacing={1}>
              <Button color="inherit" onClick={() => { setFile(null); setTable(null); setPreview(null); setResult(null); setConsent(false); }}>Import another</Button>
              <Button color="inherit" onClick={() => navigate('../people', { relative: 'path' })}>See people</Button>
            </Stack>
          }>
            Added {result.added} · merged {result.merged}{result.setAside.length ? ` · set aside ${result.setAside.length}` : ''}
          </Alert>
        )}

        {recent.data?.imports?.length > 0 && (
          <Box>
            <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Past imports</Typography>
            <Stack spacing={1}>
              {recent.data.imports.map((imp: any) => (
                <Card key={imp.id}>
                  <CardContent>
                    <Typography>{imp.file_name}: added {imp.added}, merged {imp.merged}</Typography>
                    {imp.set_aside.length > 0 && (
                      <>
                        <Typography color="text.secondary" variant="body2">Set aside: {imp.set_aside.map((s: any) => `${Object.values(s.cells).filter(Boolean).slice(0, 2).join(' ') || `row ${s.row + 2}`} (${s.reason.toLowerCase()})`).join('; ')}</Typography>
                        <Button size="small" onClick={() => api(path(`/imports/${imp.id}/clear`), { body: {} }).then(recent.reload)}>Clear</Button>
                      </>
                    )}
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
