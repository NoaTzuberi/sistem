// Checks that the design tokens resolve to the same custom properties as in a git ref (default HEAD):
// for every selector (:root, :root:lang(en), :root[dir='rtl'], inside any @media), the final
// name → value map — later definitions win, like the cascade — must be identical. Follows @import.
// Use it for refactors that must not change a value (moving tokens between files).
//
//   npm run check:tokens                 working tree vs HEAD
//   npm run check:tokens -- --ref <ref>  working tree vs another commit
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ENTRY = 'packages/tokens/tokens.css';
const refIndex = process.argv.indexOf('--ref');
const REF = refIndex > -1 ? process.argv[refIndex + 1] : 'HEAD';

const readWorkingTree = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const readFromGit = (file) => execFileSync('git', ['show', `${REF}:${file}`], { cwd: ROOT, encoding: 'utf8' });

/** The entry with every @import inlined (paths relative to the importing file). */
function inline(file, read, seen = new Set()) {
  if (seen.has(file)) throw new Error(`@import cycle at ${file}`);
  seen.add(file);
  return read(file).replace(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g, (_, target) =>
    inline(path.posix.normalize(path.posix.join(path.posix.dirname(file), target)), read, new Set(seen)),
  );
}

/** selector (with its at-rule prefix) → Map(name → value). Strings and parentheses are respected. */
function customProperties(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const result = new Map();
  const stack = [];
  let buffer = '';
  let depth = 0;
  let quote = null;
  const flush = () => {
    const declaration = buffer.trim();
    buffer = '';
    const match = /^(--[\w-]+)\s*:([\s\S]*)$/.exec(declaration);
    if (!match || stack.length === 0) return;
    const selector = stack.join(' » ');
    if (!result.has(selector)) result.set(selector, new Map());
    result.get(selector).set(match[1], match[2].replace(/\s+/g, ' ').trim());
  };
  for (const char of text) {
    if (quote) {
      buffer += char;
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
      buffer += char;
    } else if (char === '(') {
      depth += 1;
      buffer += char;
    } else if (char === ')') {
      depth -= 1;
      buffer += char;
    } else if (depth > 0) {
      buffer += char;
    } else if (char === '{') {
      stack.push(buffer.trim().replace(/\s+/g, ' '));
      buffer = '';
    } else if (char === ';') {
      flush();
    } else if (char === '}') {
      flush();
      stack.pop();
    } else {
      buffer += char;
    }
  }
  return result;
}

const before = customProperties(inline(ENTRY, readFromGit));
const after = customProperties(inline(ENTRY, readWorkingTree));
const problems = [];
for (const selector of new Set([...before.keys(), ...after.keys()])) {
  const old = before.get(selector) ?? new Map();
  const now = after.get(selector) ?? new Map();
  for (const name of new Set([...old.keys(), ...now.keys()])) {
    if (!old.has(name)) problems.push(`${selector}  ${name}: added`);
    else if (!now.has(name)) problems.push(`${selector}  ${name}: missing`);
    else if (old.get(name) !== now.get(name)) problems.push(`${selector}  ${name}: "${old.get(name)}" → "${now.get(name)}"`);
  }
}

const count = [...after.values()].reduce((sum, map) => sum + map.size, 0);
if (problems.length > 0) {
  console.error(`Tokens differ from ${REF} (${problems.length}):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`Tokens match ${REF}: ${count} custom properties in ${after.size} selectors.`);
