// Checks the docs with the owner's own tools:
// - prosekeep: house style and plain language, with the settings in .editorial.json
// - closedtab: every Agent Action Record covers all six parts
// plain-language-default is left out: its sentence check counts a Markdown
// heading and the line after it as one sentence. Run it by hand with
// `npx plain-language-default check FILE`.

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

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

for (const file of readdirSync('docs').filter((f) => /^aar-.*\.md$/.test(f)).sort()) {
  const res = run('closedtab', ['check', `docs/${file}`]);
  const score = res.out.match(/score:\s*(\d)\/6/);
  console.log(`closedtab docs/${file}: ${score ? `${score[1]}/6` : 'no score'}`);
  if (!score || score[1] !== '6') failed = true;
}

process.exit(failed ? 1 : 0);
