import { describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import { cleanPhone, dateOrder, findHeaderRow, flipLastFirst, guessColumns, guessType, isoDate, lastFirstColumn, personFromRow, phoneKey, sheetFromMatrix, splitMany } from '../src/shared/importing';
import type { Field } from '../src/shared/types';
import wildApricot from '../samples/exports/wild-apricot-members.csv?raw';
import mailchimp from '../samples/exports/mailchimp-subscribed.csv?raw';
import googleForms from '../samples/exports/google-forms-responses.csv?raw';
import signUpGenius from '../samples/exports/signupgenius-report.csv?raw';
import googleContacts from '../samples/exports/google-contacts.csv?raw';
import european from '../samples/exports/european-semicolon.csv?raw';

const fields: Field[] = [
  { id: 'skills', label: 'Skills', type: 'many', options: [], position: 0 },
  { id: 'exp', label: 'Experience', type: 'one', options: ['New', 'Can lead'], position: 1 },
];

function read(text: string) {
  const sheet = sheetFromMatrix(Papa.parse<string[]>(text, { skipEmptyLines: true }).data);
  const map = guessColumns(sheet.columns, sheet.rows, fields);
  const people = sheet.rows.map((r) => personFromRow(r, map));
  const where = (target: string) => Object.keys(map).filter((c) => map[c] === target);
  return { sheet, map, people, where };
}

describe('exports from other tools', () => {
  it('Wild Apricot: keeps every email when another column has "email" in its name', () => {
    const { map, people, where } = read(wildApricot);
    expect(where('email')).toEqual(['Email']);
    expect(map['Email delivery disabled']).toBe('ignore');
    expect(people[0]).toEqual({ name: 'Marisol Vega', email: 'marisol.vega@example.org', phone: '(503) 555-0142' });
    expect(people[1].phone).toBe('503-555-0177');
    expect(people[3]).toMatchObject({ name: "Pat O'Brien", email: 'pat.obrien@example.org', phone: '' });
    expect(people[4].email).toBe('ines.cr@example.org');
    expect(map['Membership level']).toBe('member:category');
    expect(map['Member since']).toBe('member:since');
    expect(map['Renewal due']).toBe('member:expires');
    for (const c of ['User ID', 'Balance', 'Profile last updated', 'Creation date', 'Last login date', 'Membership enabled']) expect(map[c]).toBe('ignore');
  });

  it('Mailchimp: leaves out the bookkeeping columns', () => {
    const { map, people, where } = read(mailchimp);
    expect(where('email')).toEqual(['Email Address']);
    expect(where('first')).toEqual(['First Name']);
    expect(where('phone')).toEqual(['Phone Number']);
    expect(people[0]).toMatchObject({ name: 'Marisol Vega', email: 'marisol.vega@example.org' });
    for (const c of ['MEMBER_RATING', 'OPTIN_IP', 'CONFIRM_TIME', 'LATITUDE', 'LEID', 'EUID', 'TIMEZONE', 'LAST_CHANGED']) expect(map[c]).toBe('ignore');
    expect(splitMany('"Volunteer","Saturday crew","Spanish speaker"')).toEqual(['Volunteer', 'Saturday crew', 'Spanish speaker']);
  });

  it('Google Forms: reads question text as column names', () => {
    const { map, people, where, sheet } = read(googleForms);
    expect(where('name')).toEqual(['Your full name']);
    expect(where('phone')).toEqual(['Best phone number to reach you']);
    expect(map.Timestamp).toBe('ignore');
    expect(people[0]).toEqual({ name: 'Marisol Vega', email: 'marisol.vega@example.org', phone: '503-555-0142' });
    expect(guessType(sheet.rows.map((r) => r['Which days can you help? (check all that apply)']))).toBe('many');
    expect(guessType(sheet.rows.map((r) => r["Do you have a valid driver's license?"]))).toBe('yesno');
  });

  it('SignUpGenius: finds the column names under the title rows', () => {
    const { sheet, people, where } = read(signUpGenius);
    expect(sheet.skippedAbove).toBe(2);
    expect(sheet.columns.slice(0, 2)).toEqual(['Sign Up', 'Start Date/Time (mm/dd/yyyy)']);
    expect(where('email')).toEqual(['Email']);
    expect(people[0]).toMatchObject({ name: 'Marisol Vega', email: 'marisol.vega@example.org' });
    expect(people[4]).toEqual({ name: '', email: '', phone: '' });
  });

  it('Google Contacts: takes the address, not its label', () => {
    const { map, people, where } = read(googleContacts);
    expect(where('email')).toEqual(['E-mail 1 - Value']);
    expect(where('phone')).toEqual(['Phone 1 - Value']);
    expect(map['E-mail 1 - Label']).toBe('ignore');
    expect(map['Organization Name']).toBe('ignore');
    expect(people[0]).toEqual({ name: 'Marisol Vega', email: 'marisol.vega@example.org', phone: '(503) 555-0142' });
    expect(people[1].phone).toBe('503-555-0177');
    expect(splitMany('Volunteers ::: Saturday crew ::: * myContacts')).toEqual(['Volunteers', 'Saturday crew', 'myContacts']);
  });

  it('a French roster: semicolons, a byte order mark and day-first dates', () => {
    const { sheet, people, where } = read(european);
    expect(sheet.columns[0]).toBe('Nom');
    expect(where('first')).toEqual(['Prénom']);
    expect(where('last')).toEqual(['Nom']);
    expect(people[0].name).toBe('Marisol Vega');
    const expiry = sheet.rows.map((r) => r["Date d'expiration"]);
    expect(dateOrder(expiry)).toBe('dmy');
    expect(isoDate(expiry[0], 'dmy')).toBe('2027-03-14');
  });
});

describe('reading cells', () => {
  it('finds the header row', () => {
    expect(findHeaderRow([['Name', 'Email'], ['A', 'a@example.com']])).toBe(0);
    expect(findHeaderRow([['Roster 2026'], [], ['Name', 'Email', 'Cell'], ['A', 'a@example.com', '5035550100']])).toBe(2);
    expect(findHeaderRow([['Updated', '2026-11-01'], ['Name', 'Joined'], ['A', '2021-03-14']])).toBe(1);
  });

  it('drops a total row with no name only when it has no contact, and keeps padding out', () => {
    const sheet = sheetFromMatrix([['Name', 'Email', '', ''], ['A', 'a@example.com', '', ''], ['', '', '', '']]);
    expect(sheet.columns).toEqual(['Name', 'Email']);
    expect(sheet.rows).toHaveLength(1);
  });

  it('reads dates in the forms exports use', () => {
    expect(isoDate('3/14/2021')).toBe('2021-03-14');
    expect(isoDate('2025-07-24 11:18:07')).toBe('2025-07-24');
    expect(isoDate('11/28/2026 4:00pm')).toBe('2026-11-28');
    expect(isoDate('14 Mar 2021')).toBe('2021-03-14');
    expect(isoDate('March 14, 2021')).toBe('2021-03-14');
    expect(isoDate('25/12/2026')).toBeNull();
    expect(isoDate('25/12/2026', 'dmy')).toBe('2026-12-25');
    expect(isoDate('3/14/21')).toBe('2021-03-14');
    expect(isoDate('soon')).toBeNull();
    expect(isoDate('42')).toBeNull();
    expect(dateOrder(['3/4/2026', '12/1/2026'])).toBe('mdy');
  });

  it('cleans phones and matches them across formats', () => {
    expect(cleanPhone('503-555-0177 x12')).toBe('503-555-0177');
    expect(cleanPhone('(503) 555-0177 ext. 4')).toBe('(503) 555-0177');
    expect(phoneKey('+1 971 555 0110')).toBe(phoneKey('971.555.0110'));
    expect(phoneKey('12')).toBeNull();
  });

  it('flips "Last, First" only when the column is written that way', () => {
    expect(lastFirstColumn(['Nguyen, Thu', 'Vega, Marisol', 'Okoye, Darnell'])).toBe(true);
    expect(lastFirstColumn(['Thu Nguyen', 'Vega, Marisol', 'Darnell Okoye'])).toBe(false);
    expect(flipLastFirst('Nguyen, Thu')).toBe('Thu Nguyen');
  });

  it('guesses a type for a new field', () => {
    expect(guessType(['Yes', 'no', 'YES'])).toBe('yesno');
    expect(guessType(['3/14/2021', '9/1/2023'])).toBe('date');
    expect(guessType(['42.5', '0', '12'])).toBe('number');
    expect(guessType(['97202', '02134'])).toBe('text');
    expect(guessType(['Events; Plant sale', 'Trails', 'Events'])).toBe('many');
    expect(guessType(['Family', 'Individual', 'Student', 'Family', 'Individual', 'Family'])).toBe('one');
    expect(guessType(['Prefers texts', 'Board member 2020-2022', 'Donor only', 'No email on file', 'Archived', 'Duplicate record'])).toBe('text');
  });

  it('never runs two columns together into one email', () => {
    const map = { a: 'email', b: 'email', n: 'name' };
    expect(personFromRow({ a: 'Home', b: 'sam@example.com', n: 'Sam' }, map).email).toBe('sam@example.com');
  });
});
