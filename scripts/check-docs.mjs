// Checks the docs with the owner's own tools:
// - prosekeep: house style and plain language, with the settings in .editorial.json
// - closedtab: every Agent Action Record covers all six parts
// - the words on the app's screens, pulled out by ui-copy.mjs, get the same
//   prosekeep check, and no single string may run past 20 words
// plain-language-default is left out: its sentence check counts a Markdown
// heading and the line after it as one sentence. Run it by hand with
// `npx plain-language-default check FILE`.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect } from './ui-copy.mjs';

let failed = false;
const run = (bin, args) => {
  try {
    return { ok: true, out: execFileSync('npx', ['--no-install', bin, ...args], { encoding: 'utf8' }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

const style = run('prosekeep', ['check']);
process.stdout.write(style.out);
if (!style.ok) failed = true;

// The app's screens.
const MAX_WORDS = 20;
const copy = collect(['src/web', 'src/worker', 'src/shared']);
const copyFile = join(mkdtempSync(join(tmpdir(), 'ui-copy-')), 'interface-copy.md');
writeFileSync(copyFile, `# Interface copy\n\n${copy.map((c) => `- ${c.text} (${c.file}:${c.line})`).join('\n')}\n`);
const ui = run('prosekeep', ['check', copyFile]);
process.stdout.write(`interface copy (${copy.length} strings): ${ui.out.trim().split('\n').pop()}\n`);
if (!ui.ok) {
  process.stdout.write(ui.out);
  failed = true;
}
for (const c of copy.filter((c) => c.text.split(/\s+/).length > MAX_WORDS)) {
  console.log(`too long (${c.text.split(/\s+/).length} words, limit ${MAX_WORDS}): ${c.file}:${c.line} ${c.text}`);
  failed = true;
}

for (const file of readdirSync('docs').filter((f) => /^aar-.*\.md$/.test(f)).sort()) {
  const res = run('closedtab', ['check', `docs/${file}`]);
  const score = res.out.match(/score:\s*(\d)\/6/);
  console.log(`closedtab docs/${file}: ${score ? `${score[1]}/6` : 'no score'}`);
  if (!score || score[1] !== '6') failed = true;
}

process.exit(failed ? 1 : 0);
