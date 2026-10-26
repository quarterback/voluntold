// Renders public/favicon.svg to the PNG sizes browsers and phones ask for.
//
//   node scripts/make-icons.mjs
//
// Needs Playwright. It is not a dependency of this project: use the one on the
// machine, or `npx playwright install chromium` first.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const svg = join(here, '..', 'public', 'favicon.svg');
const pub = join(here, '..', 'public');
const SIZES = [[16, 'favicon-16.png'], [32, 'favicon-32.png'], [180, 'apple-touch-icon.png'], [512, 'icon-512.png']];

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

const { readFileSync } = await import('node:fs');
const markup = readFileSync(svg, 'utf8');

const browser = await chromium.launch();
for (const [size, name] of SIZES) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><meta charset="utf-8">` +
    `<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>` +
    markup,
  );
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(pub, name), omitBackground: true });
  await page.close();
  console.log(`wrote public/${name} (${size}px)`);
}
await browser.close();
