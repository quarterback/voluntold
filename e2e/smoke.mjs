// Walks the pilot check in docs/SPEC.md through the real screens, on a phone
// sized window. Needs the app running locally in dev mode:
//   npm run build && npx wrangler d1 migrations apply DB --local && npx wrangler dev
// Then: node e2e/smoke.mjs [base url] [screenshot folder]

import { createRequire } from 'node:module';
// Uses the Playwright installed on the machine, so the repo doesn't pin a browser.
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://127.0.0.1:8787';
const SHOTS = process.argv[3] ?? 'test-results/screens';
mkdirSync(SHOTS, { recursive: true });

const PHONE = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const browser = await chromium.launch();
const coordinator = await browser.newContext({ ...PHONE, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await coordinator.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

let step = 0;
async function shot(name) {
  step++;
  // Let menus and dialogs finish animating, and start from the top so the
  // sticky app bar sits where it does on screen.
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(SHOTS, `${String(step).padStart(2, '0')}-${name}.png`), fullPage: true });
}
function check(ok, what) {
  if (!ok) throw new Error(`Check failed: ${what}`);
  console.log(`ok - ${what}`);
}
async function noSideScroll(p, where) {
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!wide, `no sideways scrolling on ${where}`);
}

async function signIn(p, email) {
  await p.goto(`${BASE}/login`);
  await p.getByLabel('Email').fill(email);
  await p.getByRole('button', { name: 'Send code' }).click();
  const code = (await p.getByText(/Test mode code/).textContent()).match(/\d{6}/)[0];
  await p.getByLabel('Code').fill(code);
  await p.getByRole('button', { name: 'Sign in' }).click();
}

// 1. Create an organization and add a second admin.
const email = `coord-${Date.now()}@example.com`;
await signIn(page, email);
await page.getByLabel('Organization name').fill('Chapter A');
await page.getByRole('button', { name: 'Create organization' }).click();
await page.getByText('Volunteer details').waitFor();
await shot('settings-new-org');
await noSideScroll(page, 'Settings');
await page.getByLabel('Email', { exact: true }).fill(`second-${Date.now()}@example.com`);
await page.getByRole('combobox').filter({ hasText: 'Coordinator' }).click();
await page.getByRole('option', { name: 'Admin' }).click();
await page.getByRole('button', { name: 'Add member' }).click();
await page.getByText(/second-.*@example.com/).waitFor();
check((await page.getByText('Admin', { exact: true }).count()) >= 2, 'second admin added');
check(await page.getByText('Can lead').count() > 0, 'starter field Experience has Can lead');

// 2. Import the sample CSV, merge the duplicate, set aside the row with no contact.
await page.getByRole('button', { name: 'Import file' }).click();
await page.locator('input[type=file]').setInputFiles('samples/volunteers.csv');
await page.getByText('Match columns').waitFor();
await shot('import-map');
await noSideScroll(page, 'Import');
await page.getByRole('button', { name: 'Find duplicates' }).click();
await page.getByText('Possible duplicates').waitFor();
check(await page.getByText(/Beatrice Smith/).count() > 0, 'Bea and Beatrice offered as a duplicate');
check(await page.getByText(/1 skipped, no email or phone/).count() === 1, 'row with no contact set aside');
await page.getByLabel('They agreed to be contacted').check();
await shot('import-check');
await page.getByRole('button', { name: /^Import \d+ people$/ }).click();
await page.getByText(/Added 18 · merged 1 · set aside 1/).waitFor();
console.log('ok - imported 18, merged 1, set aside 1');

// The XML sample goes through the same screens.
await page.getByRole('button', { name: 'Import another file' }).click();
await page.locator('input[type=file]').setInputFiles('samples/volunteers.xml');
await page.getByText('Match columns').waitFor();
await page.getByRole('button', { name: 'Find duplicates' }).click();
await page.getByLabel('They agreed to be contacted').check();
await page.getByRole('button', { name: /^Import \d+ people$/ }).click();
await page.getByText(/Added 3/).waitFor();
console.log('ok - imported 3 from XML');

// 3. A team, "Desk crew", with 4 people.
await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Settings', exact: true }).click();
await page.getByLabel('New team').fill('Desk crew');
await page.getByRole('button', { name: 'Add team' }).click();
await page.getByText(/Desk crew · 0 people/).waitFor();
for (const name of ['Jordan Lee', 'Priya Nair', 'Omar Haddad', 'Sam Okafor']) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'People', exact: true }).click();
  await page.getByLabel('Search').fill(name);
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await page.getByLabel('Desk crew').check();
  await page.waitForResponse((r) => r.url().includes('/members') && r.request().method() === 'POST');
}
await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'People', exact: true }).click();
await page.getByLabel('Search').fill('');
await shot('people');
await noSideScroll(page, 'People');

// 4. A task that needs "Experience is Can lead" and "on Desk crew".
await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Tasks', exact: true }).click();
await page.getByRole('button', { name: 'New task' }).click();
await page.getByLabel('Title').fill('Registration desk');
const start = new Date(Date.now() + 4 * 86400000);
start.setHours(12, 0, 0, 0);
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
await page.getByLabel('Starts').fill(iso(start));
await page.getByLabel('Ends').fill(iso(new Date(start.getTime() + 2 * 3600000)));
await page.getByLabel('Place').fill('Downtown library');
await page.getByLabel('Address').fill('120 Main St, Room 2');
await page.getByRole('spinbutton', { name: 'People' }).fill('2');
await page.getByRole('button', { name: 'Add requirement' }).click();
await page.getByLabel('Detail').first().click();
await page.getByRole('option', { name: 'Experience' }).click();
await page.getByLabel('Value').first().click();
await page.getByRole('option', { name: 'Can lead' }).click();
await page.getByRole('button', { name: 'Add requirement' }).click();
await page.getByLabel('Detail').nth(1).click();
await page.getByRole('option', { name: 'On the Desk crew team' }).click();
await shot('task-form');
await noSideScroll(page, 'New task');
await page.getByRole('button', { name: 'Save and open' }).click();
await page.getByText('Experience is Can lead').waitFor();

// Only Jordan, Priya and Omar meet both. "A few at a time" asks up to 4.
await page.getByRole('button', { name: /^Ask \d+ (person|people)$/ }).click();
const dialog = page.getByRole('dialog');
const fits = await dialog.locator('li, [role=button]').filter({ has: page.locator('input[type=checkbox]') }).allTextContents();
check(fits.length === 3 && ['Jordan', 'Priya', 'Omar'].every((n) => fits.join(' ').includes(n)), 'only people who meet both requirements fit');
check((await dialog.getByText(/Missing a requirement:.*Sam Okafor/).count()) === 1, 'Sam shown as missing a requirement');
await shot('who-to-ask');
await dialog.getByRole('button', { name: 'Ask 3 people' }).click();

// 5. Copy all, open two links on two phones, say yes. A third gets "already filled".
await page.getByText('Send 3 links').waitFor();
await shot('copy-links');
await page.getByRole('button', { name: 'Copy all messages' }).click();
const messages = await page.getByTestId('ask-message').allTextContents();
const links = messages.map((m) => m.match(/https?:\/\/\S+\/v\/[\w-]+/)[0].replace(/^https?:\/\/[^/]+/, BASE));
check(links.length === 3, 'three private links to send');
await page.getByRole('button', { name: 'Done' }).click();

async function phoneSays(link, answer) {
  const ctx = await browser.newContext(PHONE);
  const p = await ctx.newPage();
  await p.goto(link);
  check(!p.url().includes('/v/'), 'token removed from the address bar');
  await p.getByRole('button', { name: answer, exact: true }).waitFor();
  return { ctx, p, answer: async () => { await p.getByRole('button', { name: answer, exact: true }).click(); } };
}
const one = await phoneSays(links[0], 'Yes');
await one.answer();
await one.p.getByText(/You said yes/).waitFor();
await one.p.screenshot({ path: join(SHOTS, `${String(++step).padStart(2, '0')}-volunteer-yes.png`), fullPage: true });
await noSideScroll(one.p, 'volunteer page');
const two = await phoneSays(links[1], 'Yes');
await two.answer();
await two.p.getByText(/You said yes/).waitFor();
await page.reload();
await page.getByText('2 of 2 said yes').waitFor();
console.log('ok - task shows 2 of 2');
const three = await browser.newContext(PHONE);
const p3 = await three.newPage();
await p3.goto(links[2]);
await p3.getByText("This one's already filled. Thank you.").waitFor();
console.log('ok - third person sees already filled');
await shot('task-full');

// 6. One person can't make it. Today says what to do about the open spot.
await two.p.getByRole('button', { name: "I can't make it" }).click();
await two.p.getByRole('button', { name: 'Give up spot' }).click();
await two.p.getByText('Nothing coming up').waitFor();
await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Today', exact: true }).click();
await page.getByText(/Registration desk/).first().waitFor();
await shot('today');
await noSideScroll(page, 'Today');
check((await page.getByText(/No one left to ask for Registration desk|Ask more people for Registration desk/).count()) > 0, 'Today says what to do about the reopened spot');

// The same screens on a desktop.
await page.setViewportSize({ width: 1280, height: 860 });
for (const [name, where] of [['desktop-today', 'Today'], ['desktop-tasks', 'Tasks'], ['desktop-people', 'People']]) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: where, exact: true }).click();
  await page.waitForLoadState('networkidle');
  await shot(name);
  await noSideScroll(page, `${where} on desktop`);
}
await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Tasks', exact: true }).click();
await page.getByRole('button', { name: /Registration desk/ }).first().click();
await page.getByText('Said yes').first().waitFor();
await shot('desktop-task');
await one.p.setViewportSize({ width: 1280, height: 860 });

check(errors.length === 0, `no page errors (${errors.join('; ')})`);
await browser.close();
console.log('smoke test passed');
