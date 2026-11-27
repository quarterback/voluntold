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
  await p.getByLabel('Verification code').fill(code);
  await p.getByRole('button', { name: 'Sign in' }).click();
}

// 1. Sign up in two short steps, land on Today with the setup guide, and add a second admin.
const email = `coord-${Date.now()}@example.com`;
await signIn(page, email);
await page.getByRole('heading', { name: 'Create your organization' }).waitFor();
await shot('sign-up-step-1');
await page.getByLabel('Organization name').fill('Chapter A');
await page.getByRole('button', { name: 'Next' }).click();
await page.getByLabel('Everyone on our roster is 18 or older').check();
await shot('sign-up-step-2');
await page.getByRole('button', { name: 'Create organization' }).click();
await page.getByRole('heading', { name: 'Get started' }).waitFor();
check((await page.getByText('1 of 6 done').count()) === 1, 'a new organization lands on Today with the setup guide');
await shot('today-setup-guide');
await noSideScroll(page, 'Today with the setup guide');
const settings = page.url().replace(/\/today.*/, '/settings');

await page.getByRole('button', { name: 'Review custom fields' }).click();
await page.getByRole('heading', { name: 'Custom fields' }).waitFor();
check(await page.getByText('Can lead').count() > 0, 'starter field Experience has Can lead');
await shot('settings-custom-fields');
await noSideScroll(page, 'Custom fields');

await page.goto(settings);
await page.getByRole('navigation', { name: 'Settings' }).waitFor();
check(!/AT Protocol|Bluesky/.test(await page.locator('body').innerText()), 'no AT Protocol in Settings during setup');
await shot('settings-menu');
await noSideScroll(page, 'Settings');
await page.getByRole('button', { name: /Admins and coordinators/ }).click();
await page.getByLabel('Email', { exact: true }).fill(`second-${Date.now()}@example.com`);
await page.getByRole('button', { name: 'Add admin' }).click();
await page.getByText(/second-.*@example.com/).waitFor();
check((await page.getByText('Admin', { exact: true }).count()) >= 2, 'second admin added');

// 2. Import the sample CSV, merge the duplicate, skip the row with no contact.
await page.goto(settings.replace('/settings', '/today'));
await page.getByRole('button', { name: 'Import a list' }).click();
await page.locator('input[type=file]').setInputFiles('samples/volunteers.csv');
await page.getByRole('heading', { name: 'Match columns' }).waitFor();
check((await page.getByText('alex@example.com').count()) > 0, 'each column shows what it holds');
await page.getByLabel('Keep T-shirt').check();
await shot('import-match');
await noSideScroll(page, 'Import, match columns');
await page.getByRole('button', { name: 'Next' }).click();
await page.getByText('Possible duplicates').waitFor();
check(await page.getByText(/Beatrice Smith/).count() > 0, 'Bea and Beatrice offered as a duplicate');
check(await page.getByText(/Noor Rahman · No email or phone/).count() === 1, 'row with no contact skipped, with the reason');
await page.getByLabel('These people agreed to be contacted by us').check();
await shot('import-review');
await noSideScroll(page, 'Import, review');
await page.getByRole('button', { name: /^Import \d+ people$/ }).click();
await page.getByText(/Added 18 · merged 1 · skipped 1/).waitFor();
console.log('ok - imported 18, merged 1, skipped 1');

// The XML sample goes through the same screens.
await page.getByRole('button', { name: 'Import another file' }).click();
await page.locator('input[type=file]').setInputFiles('samples/volunteers.xml');
await page.getByRole('heading', { name: 'Match columns' }).waitFor();
await page.getByRole('button', { name: 'Next' }).click();
await page.getByLabel('These people agreed to be contacted by us').check();
await page.getByRole('button', { name: /^Import \d+ people$/ }).click();
await page.getByText(/Added 3/).waitFor();
console.log('ok - imported 3 from XML');

// 3. A team, "Desk crew", with 4 people.
await page.goto(`${settings}/teams`);
await page.getByLabel('Team name').fill('Desk crew');
await page.getByRole('button', { name: 'Add team' }).click();
await page.getByText(/Desk crew · 0 people/).waitFor();
for (const name of ['Jordan Lee', 'Priya Nair', 'Omar Haddad', 'Sam Okafor']) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'People', exact: true }).click();
  await page.getByLabel('Search').fill(name);
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  const added = page.waitForResponse((r) => r.url().includes('/members') && r.request().method() === 'POST');
  await page.getByLabel('Desk crew').check();
  await added;
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
await page.getByLabel('Start', { exact: true }).fill(iso(start));
await page.getByLabel('End', { exact: true }).fill(iso(new Date(start.getTime() + 2 * 3600000)));
await page.getByLabel('Location').fill('Downtown library');
await page.getByLabel('Address').fill('120 Main St, Room 2');
await page.getByRole('spinbutton', { name: 'People needed' }).fill('2');
await page.getByRole('button', { name: 'Add requirement' }).click();
await page.getByLabel('Field').first().click();
await page.getByRole('option', { name: 'Experience' }).click();
await page.getByLabel('Value').first().click();
await page.getByRole('option', { name: 'Can lead' }).click();
await page.getByRole('button', { name: 'Add requirement' }).click();
await page.getByLabel('Field').nth(1).click();
await page.getByRole('option', { name: 'Team: Desk crew' }).click();
await shot('task-form');
await noSideScroll(page, 'New task');
await page.getByRole('button', { name: 'Publish' }).click();
await page.getByText('Experience is Can lead').waitFor();

// Only Jordan, Priya and Omar meet both. "A few at a time" asks up to 4.
await page.getByRole('button', { name: /^Ask \d+ (person|people)$/ }).click();
const dialog = page.getByRole('dialog');
const fits = await dialog.locator('li, [role=button]').filter({ has: page.locator('input[type=checkbox]') }).allTextContents();
check(fits.length === 3 && ['Jordan', 'Priya', 'Omar'].every((n) => fits.join(' ').includes(n)), 'only people who meet both requirements fit');
check((await dialog.getByText(/Missing requirement:.*Sam Okafor/).count()) === 1, 'Sam shown as missing a requirement');
await shot('who-to-ask');
await dialog.getByRole('button', { name: 'Ask 3 people' }).click();

// 5. Copy all, open two links on two phones, say yes. A third gets "already filled".
await page.getByText('Share 3 links').waitFor();
await shot('copy-links');
await page.getByRole('button', { name: 'Copy all' }).click();
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
const one = await phoneSays(links[0], 'Accept');
await one.answer();
await one.p.getByText('Accepted', { exact: true }).waitFor();
await one.p.screenshot({ path: join(SHOTS, `${String(++step).padStart(2, '0')}-volunteer-yes.png`), fullPage: true });
await noSideScroll(one.p, 'volunteer page');
const two = await phoneSays(links[1], 'Accept');
await two.answer();
await two.p.getByText('Accepted', { exact: true }).waitFor();
await page.reload();
await page.getByText('2 of 2 confirmed').waitFor();
console.log('ok - task shows 2 of 2');
const three = await browser.newContext(PHONE);
const p3 = await three.newPage();
await p3.goto(links[2]);
await p3.getByText('This task is full').waitFor();
console.log('ok - third person sees already filled');
await shot('task-full');

// 6. One person can't make it. Today says what to do about the open spot.
await two.p.getByRole('button', { name: 'Cancel spot' }).click();
await two.p.getByRole('dialog').getByRole('button', { name: 'Cancel spot' }).click();
await two.p.getByText('No upcoming tasks').waitFor();
await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Today', exact: true }).click();
await page.getByText(/Registration desk/).first().waitFor();
await shot('today');
await noSideScroll(page, 'Today');
check((await page.getByText(/1 of 2/).count()) > 0, 'Today shows the reopened spot');

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
await page.getByText('Volunteers', { exact: true }).first().waitFor();
await shot('desktop-task');
await one.p.setViewportSize({ width: 1280, height: 860 });

check(errors.length === 0, `no page errors (${errors.join('; ')})`);
await browser.close();
console.log('smoke test passed');
