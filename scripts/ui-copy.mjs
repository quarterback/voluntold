// Pulls the words people see in the app out of the code, so prosekeep and
// plain-language-default can check them like any document.
//
// It collects JSX text, the text props of components (labels, helper text,
// placeholders, titles, aria labels), strings passed to fail() on the server,
// and the text maps in format.ts. Code, class names and URLs are skipped.
//
//   node scripts/ui-copy.mjs [out.md]      writes one line per string, with file:line

import ts from 'typescript';
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TEXT_PROPS = new Set(['label', 'helperText', 'placeholder', 'title', 'aria-label', 'message', 'primary', 'secondary', 'caption']);
const TEXT_CALLS = new Set(['fail', 'confirm', 'prompt', 'setProblem', 'setError', 'setCopied']);

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|mjs)$/.test(name) ? [p] : [];
  });
}

function looksLikeProse(s) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length < 2 || !/[A-Za-z]{2}/.test(t)) return false;
  if (/^[a-z][\w.-]*$/.test(t) && !t.includes(' ')) return false; // identifiers, keys
  if (/^(https?:|\/|#|\.|[\w-]+\.(js|ts|md|json|png)$)/.test(t)) return false;
  if (/^[\w-]+(\s[\w-]+)*$/.test(t) && /[A-Z_]{3,}|[a-z][A-Z]/.test(t)) return false; // CONSTANTS, camelCase
  return true;
}

function textOf(node, sf) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return node.head.text + node.templateSpans.map((s) => '…' + s.literal.text).join('');
  }
  if (ts.isJsxExpression(node) && node.expression) return textOf(node.expression, sf);
  return null;
}

export function collect(roots) {
  const out = [];
  for (const file of roots.flatMap(files)) {
    const src = readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const add = (node, text) => {
      if (text && looksLikeProse(text)) {
        out.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: text.replace(/\s+/g, ' ').trim() });
      }
    };
    const visit = (node) => {
      if (ts.isJsxText(node)) add(node, node.text);
      else if (ts.isJsxAttribute(node) && node.initializer && TEXT_PROPS.has(node.name.getText(sf))) add(node, textOf(node.initializer, sf));
      else if (ts.isCallExpression(node) && TEXT_CALLS.has(node.expression.getText(sf).split('.').pop())) {
        for (const arg of node.arguments) add(arg, textOf(arg, sf));
      } else if (ts.isPropertyAssignment(node) && file.endsWith('format.ts')) add(node, textOf(node.initializer, sf));
      else if (ts.isConditionalExpression(node) && ts.isJsxExpression(node.parent)) {
        add(node.whenTrue, textOf(node.whenTrue, sf));
        add(node.whenFalse, textOf(node.whenFalse, sf));
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const items = collect(['src/web', 'src/worker', 'src/shared']);
  const body = items.map((i) => `- ${i.text} (${i.file}:${i.line})`).join('\n');
  const out = process.argv[2];
  const doc = `# Interface copy\n\nEvery string people see in the app, with where it comes from.\n\n${body}\n`;
  if (out) writeFileSync(out, doc);
  else process.stdout.write(doc);
  console.error(`${items.length} strings, ${items.reduce((n, i) => n + i.text.split(/\s+/).length, 0)} words`);
}
