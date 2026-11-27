// Reading a list that came out of another tool: which row holds the column
// names, what each column is, and how to clean the cells. The browser uses it
// to suggest a match for each column, and the server uses it to build each
// person, so both read a row the same way.

import type { Field, FieldType } from './types';

/** Where a column goes: name | first | last | email | phone | ignore | field:<id> | new:<label> | member:<part>. */
export type Target = string;

export interface Sheet {
  columns: string[];
  rows: Record<string, string>[];
  /** Rows above the column names, such as a report title. */
  skippedAbove: number;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_LIKE = /^\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}(\b|T)/;

/** "E-mail 1 - Value" and "Email Address" both become letters and digits only. */
export function headerKey(header: string): string {
  return header.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  return String(v).replace(/^﻿/, '').trim();
}

const digitCount = (s: string) => s.replace(/\D/g, '').length;

/** A phone number without its extension. Two numbers in one cell keep the first. */
export function cleanPhone(raw: string): string {
  return raw.split(/\s*:::\s*|\s+\/\s+|\s+or\s+/i)[0].replace(/[\s,;]*(?:x|ext\.?|extension|#)\s*\d+\s*$/i, '').trim();
}

/** Two phone numbers are the same person's when their last 10 digits match. */
export function phoneKey(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = cleanPhone(phone).replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function looksLikePhone(s: string): boolean {
  const d = digitCount(cleanPhone(s));
  return d >= 7 && d <= 15 && /^[\d\s()+.\-/]+$/.test(cleanPhone(s));
}

/** A cell that could be a column name: words, not an address, a number or a date. */
function looksLikeLabel(s: string): boolean {
  if (s.length > 120 || EMAIL.test(s) || DATE_LIKE.test(s)) return false;
  if (/^[\d\s.,$€£%()+-]+$/.test(s)) return false;
  return /[a-z]/i.test(s);
}

const HEADER_WORDS = /name|e-?mail|phone|mobile|cell|address|member|status|date|skill|note|first|last|nom|comment|timestamp|level|type|joined|expire/i;

/**
 * The row that holds the column names. Exports often put a report title or a
 * "generated on" line above it, so the first row isn't always the one.
 */
export function findHeaderRow(matrix: unknown[][]): number {
  let best = -1;
  let bestScore = 0;
  const limit = Math.min(matrix.length, 30);
  for (let i = 0; i < limit; i++) {
    const cells = (matrix[i] ?? []).map(cellText).filter(Boolean);
    if (cells.length === 0 || !cells.every(looksLikeLabel)) continue;
    // A header needs rows under it.
    if (!matrix.slice(i + 1).some((r) => (r ?? []).some((c) => cellText(c) !== ''))) continue;
    const score = cells.length + 2 * cells.filter((c) => HEADER_WORDS.test(c)).length;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  if (best >= 0) return best;
  return Math.max(0, matrix.findIndex((r) => (r ?? []).some((c) => cellText(c) !== '')));
}

/** Rows of cells into named columns, starting at the row that holds the names. */
export function sheetFromMatrix(matrix: unknown[][]): Sheet {
  if (!matrix.some((r) => (r ?? []).some((c) => cellText(c) !== ''))) return { columns: [], rows: [], skippedAbove: 0 };
  const at = findHeaderRow(matrix);
  const skippedAbove = matrix.slice(0, at).filter((r) => (r ?? []).some((c) => cellText(c) !== '')).length;
  const body = matrix.slice(at + 1).filter((r) => (r ?? []).some((c) => cellText(c) !== ''));
  const width = Math.max(matrix[at].length, ...body.map((r) => r.length));
  const header = Array.from({ length: width }, (_, i) => cellText(matrix[at][i]) || `Column ${i + 1}`);
  const named = header.map((h, i) => (header.indexOf(h) === i ? h : `${h} (${i + 1})`));
  // A column with no name and nothing in it is padding, not data.
  const keep = named.map((_, i) => cellText(matrix[at][i]) !== '' || body.some((r) => cellText(r[i]) !== ''));
  const columns = named.filter((_, i) => keep[i]);
  const rows = body.map((r) => Object.fromEntries(named.map((col, i) => [col, cellText(r[i])] as const).filter((_, i) => keep[i])));
  return { columns, rows, skippedAbove };
}

/** Values from one cell that holds several: "Driving; Cooking", Mailchimp's quoted tags, Google's " ::: ". */
export function splitMany(raw: string): string[] {
  const parts = raw.split(/\s*:::\s*|[,;|\n]/).map((p) => p.trim().replace(/^"+|"+$/g, '').replace(/^\*\s*/, '').trim());
  return [...new Set(parts.filter(Boolean))];
}

// Dates

export type DateOrder = 'mdy' | 'dmy';

const NUMERIC_DATE = /^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})(?:[\sT,]+.*)?$/;

/** Day first or month first, from a whole column: 25/12/2026 can only be day first. */
export function dateOrder(values: string[]): DateOrder {
  let dayFirst = 0;
  let monthFirst = 0;
  for (const v of values) {
    const m = NUMERIC_DATE.exec(v.trim());
    if (!m || m[1].length === 4) continue;
    if (Number(m[1]) > 12) dayFirst++;
    else if (Number(m[2]) > 12) monthFirst++;
  }
  return dayFirst > monthFirst ? 'dmy' : 'mdy';
}

/** A date cell as 2026-03-14, or null when it can't be read. Times are dropped. */
export function isoDate(raw: string, order: DateOrder = 'mdy'): string | null {
  const text = raw.trim();
  if (!text) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const valid = (y: number, mo: number, d: number) => {
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null;
    const date = new Date(Date.UTC(y, mo - 1, d));
    return date.getUTCDate() === d ? `${y}-${pad(mo)}-${pad(d)}` : null;
  };
  const m = NUMERIC_DATE.exec(text);
  if (m) {
    if (m[1].length === 4) return valid(Number(m[1]), Number(m[2]), Number(m[3]));
    let year = Number(m[3]);
    if (m[3].length <= 2) year += year < 50 ? 2000 : 1900;
    const [a, b] = [Number(m[1]), Number(m[2])];
    return order === 'dmy' ? valid(year, b, a) : valid(year, a, b);
  }
  // "March 14, 2021" and "14 Mar 2021". A bare number is not a date.
  if (!/[a-z]/i.test(text) || !/\d{4}/.test(text)) return null;
  const t = Date.parse(`${text} UTC`);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return valid(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

// Names

/** "Nguyen, Thu" becomes "Thu Nguyen" when most of the column is written that way. */
export function lastFirstColumn(values: string[]): boolean {
  const filled = values.filter((v) => v.trim());
  if (filled.length === 0) return false;
  return filled.filter((v) => /^[^,]+,\s*[^,]+$/.test(v.trim())).length / filled.length >= 0.6;
}

export function flipLastFirst(name: string): string {
  const m = /^([^,]+),\s*([^,]+)$/.exec(name.trim());
  return m ? `${m[2].trim()} ${m[1].trim()}` : name.trim();
}

// What each column is

const FIRST_NAME = ['firstname', 'first', 'givenname', 'forename', 'fname', 'prenom', 'nombre', 'vorname'];
const LAST_NAME = ['lastname', 'last', 'surname', 'familyname', 'lname', 'nom', 'apellido', 'apellidos', 'nachname'];
const FULL_NAME = ['name', 'fullname', 'volunteer', 'volunteername', 'member', 'membername', 'contact', 'contactname', 'participant', 'participantname', 'displayname', 'person', 'who'];
const NOT_A_PERSON = /organi[sz]ation|company|business|employer|username|file|nick|phonetic|prefix|suffix|middle|maiden|event|signup|emergency|spouse|partner|parent|guardian|school|team|group|campaign|list|item|slot/;
const EMAIL_HEADER = ['email', 'emailaddress', 'mail', 'emailvalue', 'primaryemail', 'youremail', 'courriel', 'correo'];
const PHONE_HEADER = /phone|mobile|cell|tel|whatsapp/;

const CATEGORY = ['membershiptype', 'membershipcategory', 'membertype', 'membercategory', 'category', 'categorie', 'membershiplevel', 'level', 'membershipplan', 'plan', 'tier', 'type', 'membership'];
const SINCE = ['membersince', 'joined', 'joindate', 'datejoined', 'startdate', 'originaljoindate', 'membershipstartdate', 'dateadhesion', 'datedadhesion'];
const EXPIRES = ['expires', 'expiration', 'expirationdate', 'expiry', 'expirydate', 'renewaldate', 'renewaldue', 'renewalduedate', 'membershipexpires', 'membershipexpiration', 'membershipenddate', 'enddate', 'paidthrough', 'paiduntil', 'validuntil', 'dateexpiration', 'datedexpiration'];
const DUES = ['duespaid', 'paid', 'paymentdate', 'datepaid', 'lastpayment', 'lastpaymentdate', 'duesdate', 'duespaiddate'];

// Columns a tool adds for its own bookkeeping. Nobody needs them on a person's record.
const BOOKKEEPING = new Set([
  'id', 'uid', 'userid', 'memberid', 'contactid', 'recordid', 'rowid', 'leid', 'euid', 'timestamp', 'createdat', 'updatedat', 'creationdate', 'datecreated',
  'created', 'modified', 'lastmodified', 'lastchanged', 'lastupdated', 'profilelastupdated', 'levellastchanged', 'optintime', 'optinip', 'confirmtime', 'confirmip',
  'latitude', 'longitude', 'gmtoff', 'dstoff', 'timezone', 'cc', 'region', 'memberrating', 'photo', 'fileas', 'balance', 'password', 'lastlogin', 'signuptimestamp',
  'emaildeliverydisabled', 'membershipenabled', 'unsubcampaign', 'unsubtime', 'unsubreason', 'cleantime', 'cleancampaign', 'qty', 'phonetype',
]);
const BOOKKEEPING_PATTERN = /^phonetic|(prefix|suffix)$|^ip|ipaddress|\d(label|type)$|^(optin|confirm|unsub|can2)|utc$|lastlogin|lastchanged|lastupdated|emailsdisabled|termsofuse/;

/** A column the other tool keeps for itself: record IDs, timestamps, IP addresses. */
export function isBookkeeping(header: string): boolean {
  const k = headerKey(header);
  return BOOKKEEPING.has(k) || BOOKKEEPING_PATTERN.test(k) || /(^|[\s_#])id$/i.test(header.trim());
}

function share(values: string[], test: (s: string) => boolean): number {
  const filled = values.filter(Boolean);
  return filled.length === 0 ? 0 : filled.filter(test).length / filled.length;
}

/** The type a new field should have, from what the column holds. */
export function guessType(values: string[]): FieldType {
  const filled = values.map((v) => v.trim()).filter(Boolean);
  if (filled.length === 0) return 'text';
  if (filled.every((v) => /^(yes|no|y|n|true|false)$/i.test(v))) return 'yesno';
  if (filled.every((v) => isoDate(v, dateOrder(filled)) !== null)) return 'date';
  if (filled.every((v) => /^-?[\d,]+(\.\d+)?$/.test(v) && !/^0\d/.test(v))) return 'number';
  if (filled.some((v) => v.length > 60)) return 'text';
  const lists = filled.map(splitMany);
  const items = lists.flat();
  const distinctItems = new Set(items.map((i) => i.toLowerCase()));
  const short = items.every((i) => i.split(/\s+/).length <= 4);
  if (lists.some((l) => l.length > 1) && short && distinctItems.size <= 40 && (distinctItems.size < items.length || filled.length < 4)) return 'many';
  const distinct = new Set(filled.map((v) => v.toLowerCase()));
  if (distinct.size <= 12 && (distinct.size <= filled.length / 2 || (filled.length < 6 && distinct.size < filled.length))) return 'one';
  return 'text';
}

/**
 * A suggested place for every column. Only one column becomes the email and
 * one the phone, chosen by what the cells hold, so "Email delivery disabled"
 * or "E-mail 1 - Label" can't be taken for an address.
 */
export function guessColumns(columns: string[], rows: Record<string, string>[], fields: Field[]): Record<string, Target> {
  const map: Record<string, Target> = {};
  const values = (c: string) => rows.map((r) => r[c] ?? '');
  const open = () => columns.filter((c) => !(c in map));
  const empty = (c: string) => !values(c).some(Boolean);

  // Email: the column whose cells are addresses.
  const emails = open().filter((c) => (empty(c) ? EMAIL_HEADER.includes(headerKey(c)) : share(values(c), (v) => EMAIL.test(v)) >= 0.6));
  const filled = (c: string) => values(c).filter(Boolean).length;
  const fullest = (list: string[], prefer: (c: string) => boolean) => [...list].sort((a, b) => filled(b) - filled(a) || Number(prefer(b)) - Number(prefer(a)))[0];
  const email = fullest(emails, (c) => EMAIL_HEADER.includes(headerKey(c)));
  if (email) map[email] = 'email';

  // Phone: a column named like one, whose cells are numbers.
  const phones = open().filter((c) => PHONE_HEADER.test(headerKey(c)) && (empty(c) ? ['phone', 'mobile', 'cell', 'phonenumber'].includes(headerKey(c)) : share(values(c), looksLikePhone) >= 0.6));
  const phone = fullest(phones, (c) => /mobile|cell/.test(headerKey(c)));
  if (phone) map[phone] = 'phone';

  // Name: first and last, or one full name.
  const person = open().filter((c) => !NOT_A_PERSON.test(headerKey(c)));
  const first = person.find((c) => FIRST_NAME.includes(headerKey(c)));
  const last = person.find((c) => LAST_NAME.includes(headerKey(c)) && c !== first);
  const full = person.find((c) => c !== first && c !== last && (FULL_NAME.includes(headerKey(c)) || /fullname|^(your|whatisyour|volunteer|member|contact|participant)s?name/.test(headerKey(c)) || /^name/.test(headerKey(c))));
  if (first && last) {
    map[first] = 'first';
    map[last] = 'last';
  } else if (full) {
    map[full] = 'name';
  } else if (first || last) {
    map[(first ?? last)!] = first ? 'first' : 'last';
  }

  // Membership details and the organization's own fields, one column each.
  const taken = new Set<Target>();
  const singular = (s: string) => s.replace(/s$/, '');
  for (const c of open()) {
    const k = headerKey(c);
    let target: Target | null = null;
    if (isBookkeeping(c) || empty(c)) target = 'ignore';
    else if (CATEGORY.includes(k)) target = 'member:category';
    else if (SINCE.includes(k)) target = 'member:since';
    else if (EXPIRES.includes(k)) target = 'member:expires';
    else if (DUES.includes(k)) target = 'member:dues';
    else {
      const field = fields.find((f) => singular(headerKey(f.label)) === singular(k));
      if (field) target = `field:${field.id}`;
    }
    if (target && target !== 'ignore' && taken.has(target)) target = null;
    if (target && target !== 'ignore') taken.add(target);
    // Anything else waits for the coordinator to keep it or leave it out.
    map[c] = target ?? 'ignore';
  }
  return map;
}

/** Columns the tool didn't recognize and didn't rule out as bookkeeping. They're worth offering as new fields. */
export function offerAsField(column: string, rows: Record<string, string>[]): boolean {
  if (isBookkeeping(column)) return false;
  return rows.some((r) => (r[column] ?? '').trim() !== '');
}

/** The first cell among these columns that passes the test. Columns never run together. */
function firstValid(cells: Record<string, string>, columns: string[], ok: (s: string) => boolean): string {
  for (const c of columns) {
    const v = (cells[c] ?? '').trim();
    if (v && ok(v)) return v;
  }
  return '';
}

/** One row's name, email and phone, read the same way in the browser and on the server. */
export function personFromRow(cells: Record<string, string>, map: Record<string, Target>, opts: { lastFirst?: boolean } = {}): { name: string; email: string; phone: string } {
  const columnsFor = (t: Target) => Object.keys(map).filter((c) => map[c] === t);
  const text = (t: Target) => columnsFor(t).map((c) => (cells[c] ?? '').trim()).filter(Boolean).join(' ');
  const whole = text('name');
  const parts = [text('first'), text('last')].filter(Boolean).join(' ');
  // First and last name win over a full name column when a file has both.
  const name = parts || (opts.lastFirst ? flipLastFirst(whole) : whole);
  return {
    name: name.replace(/\s+/g, ' ').trim(),
    email: firstValid(cells, columnsFor('email'), (v) => EMAIL.test(v)).toLowerCase(),
    phone: cleanPhone(firstValid(cells, columnsFor('phone'), (v) => digitCount(cleanPhone(v)) >= 7)),
  };
}
