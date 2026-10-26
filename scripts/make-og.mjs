// Renders scripts/og-card.html to public/og.png at 1200x630, the size
// OpenGraph wants. Edit the card, run this, rebuild.
//
//   node scripts/make-og.mjs
//
// Needs Playwright. It is not a dependency of this project: use the one on the
// machine, or `npx playwright install chromium` first.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const card = join(here, 'og-card.html');
const out = join(here, '..', 'public', 'og.png');

let chromium;
for (const spec of ['playwright', '/opt/node-tools/node_modules/playwright/index.js']) {
  try {
    const mod = await import(spec);
    chromium = mod.chromium ?? mod.default?.chromium;
    if (chromium) break;
  } catch {
    // try the next one
  }
}
if (!chromium) {
  console.error('Playwright not found. Install it, then run this again.');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`file://${card}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
await page.screenshot({ path: out });
await browser.close();
console.log(`wrote ${out}`);
