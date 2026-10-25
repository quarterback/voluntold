// Reads an uploaded file into columns and rows, in the browser.
// CSV, Excel, XML and JSON are read here. Text, Word and PDF files are turned
// into text here, and the server has a model find the rows in that text.

import Papa from 'papaparse';
import { api } from './api';

export interface Table {
  columns: string[];
  rows: Record<string, string>[];
  notes?: string;
  via: 'direct' | 'model';
}

const MAX_BYTES = 15 * 1024 * 1024;

function fromMatrix(matrix: unknown[][]): Table {
  const nonEmpty = matrix.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
  if (nonEmpty.length === 0) return { columns: [], rows: [], via: 'direct' };
  const header = nonEmpty[0].map((c, i) => String(c ?? '').trim() || `Column ${i + 1}`);
  const columns = header.map((h, i) => (header.indexOf(h) === i ? h : `${h} (${i + 1})`));
  const rows = nonEmpty.slice(1).map((r) => Object.fromEntries(columns.map((col, i) => [col, cellText(r[i])])));
  return { columns, rows, via: 'direct' };
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function fromObjects(list: Record<string, unknown>[]): Table {
  const columns = [...new Set(list.flatMap((o) => Object.keys(o)))];
  return {
    columns,
    rows: list.map((o) => Object.fromEntries(columns.map((c) => [c, Array.isArray(o[c]) ? (o[c] as unknown[]).join(', ') : cellText(o[c])]))),
    via: 'direct',
  };
}

function parseJson(text: string): Table {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : Object.values(data).find(Array.isArray);
  if (!Array.isArray(list)) throw new Error('That JSON file has no list of people in it.');
  if (Array.isArray(list[0])) return fromMatrix(list);
  return fromObjects(list.filter((x) => x && typeof x === 'object'));
}

/** Finds the element that repeats most, and treats each one as a person. */
function parseXml(text: string): Table {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('That XML file could not be read.');
  const counts = new Map<string, Element[]>();
  doc.querySelectorAll('*').forEach((el) => {
    if (el.children.length === 0 && el.attributes.length === 0) return;
    const key = `${el.parentElement?.tagName ?? ''}>${el.tagName}`;
    counts.set(key, [...(counts.get(key) ?? []), el]);
  });
  const best = [...counts.values()].sort((a, b) => b.length - a.length)[0];
  if (!best || best.length < 1) throw new Error('That XML file has no list of people in it.');
  return fromObjects(
    best.map((el) => {
      const o: Record<string, string> = {};
      for (const a of Array.from(el.attributes)) o[a.name] = a.value;
      for (const child of Array.from(el.children)) o[child.tagName] = o[child.tagName] ? `${o[child.tagName]}, ${child.textContent?.trim()}` : child.textContent?.trim() ?? '';
      return o;
    }),
  );
}

async function pdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    const lines: string[] = [];
    for (const item of content.items as { str: string; hasEOL?: boolean }[]) {
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = '';
      } else line += ' ';
    }
    if (line.trim()) lines.push(line);
    pages.push(lines.join('\n'));
  }
  return pages.join('\n\n');
}

async function docxText(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return res.value;
}

function looksLikeCsv(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  if (lines.length < 2) return false;
  const delim = [',', '\t', ';'].find((d) => lines.every((l) => l.split(d).length > 1));
  return Boolean(delim) && lines.every((l) => l.split(delim!).length === lines[0].split(delim!).length);
}

export async function readFile(file: File, orgPath: (p: string) => string): Promise<Table> {
  if (file.size > MAX_BYTES) throw new Error('That file is over 15 MB. Split it into smaller files.');
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'csv' || ext === 'tsv') {
    const res = Papa.parse<string[]>(await file.text(), { skipEmptyLines: true });
    return fromMatrix(res.data);
  }
  if (ext === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser');
    return fromMatrix((await readSheet(file)) as unknown[][]);
  }
  if (ext === 'json') return parseJson(await file.text());
  if (ext === 'xml') return parseXml(await file.text());

  let text: string;
  if (ext === 'pdf') text = await pdfText(file);
  else if (ext === 'docx') text = await docxText(file);
  else if (ext === 'txt' || ext === 'md' || file.type.startsWith('text/')) {
    text = await file.text();
    if (looksLikeCsv(text)) return fromMatrix(Papa.parse<string[]>(text, { skipEmptyLines: true }).data);
  } else {
    throw new Error('Use a CSV, Excel (.xlsx), XML, JSON, text, Word (.docx) or PDF file.');
  }
  if (!text.trim()) throw new Error('That file has no text in it. If it is a scan, type the list into a spreadsheet instead.');
  const res = await api<{ columns: string[]; rows: string[][]; notes: string }>(orgPath('/import/extract'), { body: { fileName: file.name, text } });
  return {
    columns: res.columns,
    rows: res.rows.map((r) => Object.fromEntries(res.columns.map((c, i) => [c, r[i] ?? '']))),
    notes: res.notes,
    via: 'model',
  };
}
