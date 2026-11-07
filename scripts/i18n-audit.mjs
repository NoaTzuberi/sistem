#!/usr/bin/env node
// Phase 15 — finds user-facing text that is not in a copy file, and physical (left / right) CSS.
// Runs with `npm run lint`. No dependency: it uses the TypeScript compiler the apps already have.
//
// Flags, in apps/mobile/src, apps/dashboard/src and packages/shared/src (copy/ folders, tests and
// the allowlist below are skipped):
//   - JSX text with letters (Hebrew or Latin),
//   - user-facing JSX attributes written as a string (aria-label, placeholder, title, alt, label, …),
//   - string literals that read like an English sentence or label (two+ words, a capital first),
//     and any string with Hebrew letters,
//   - CSS lines with left / right (margin-left, padding-right, left:, text-align: left, …).
// A line (or the line above it) with `i18n-ignore` is skipped — say why next to it; `i18n-ignore-file`
// skips a whole data file. In CSS, a
// comment with `physical:` keeps a physical property on purpose (say why).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SOURCES = ['apps/mobile/src', 'apps/dashboard/src', 'packages/shared/src'];

// Paths never audited (none since the dead trainee exercise library was deleted, 2026-11-05).
const SKIPPED = [];

const USER_FACING_ATTRIBUTES = new Set([
  'aria-label',
  'aria-description',
  'aria-valuetext',
  'placeholder',
  'title',
  'alt',
  'label',
  'description',
  'emptyText',
  'hint',
  'text',
  'message',
  'confirmLabel',
  'cancelLabel',
]);

const HEBREW = /[֐-׿]/;
// "Save plan", "No trainees yet.", "Couldn't load" — a capital, then more words.
const ENGLISH_PHRASE = /^[A-Z][a-z’']+(?:[ ,.:;!?—–-]+[A-Za-z’'%0-9]+)+[.!?…]?$/;
const SINGLE_WORD_LABEL = /^[A-Z][a-z]{2,}$/;

const findings = [];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === 'copy') continue;
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function relative(file) {
  return path.relative(ROOT, file);
}

function ignored(lines, lineIndex) {
  return /i18n-ignore/.test(lines[lineIndex] ?? '') || /i18n-ignore/.test(lines[lineIndex - 1] ?? '');
}

function report(file, lines, node, sourceFile, kind, text) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  if (ignored(lines, line)) return;
  findings.push(`${relative(file)}:${line + 1}: ${kind}: ${text.replace(/\s+/g, " ").trim().slice(0, 90)}`);
}

function isInside(node, test) {
  for (let current = node.parent; current; current = current.parent) if (test(current)) return true;
  return false;
}

/** Rendered as a JSX child: inside {…} directly, or through a ? :, &&, ?? or ( ). */
function renderedInJsx(node) {
  let current = node.parent;
  while (current && (ts.isConditionalExpression(current) || ts.isBinaryExpression(current) || ts.isParenthesizedExpression(current))) {
    current = current.parent;
  }
  return Boolean(current && ts.isJsxExpression(current));
}

function isTechnicalContext(node) {
  return isInside(node, (parent) => {
    if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true;
    if (ts.isCallExpression(parent)) {
      const callee = parent.expression.getText();
      const method = callee.split('.').pop() ?? '';
      return (
        /^console\./.test(callee) ||
        /^(matchMedia|querySelector|querySelectorAll|addEventListener|removeEventListener|setAttribute|getItem|setItem|removeItem)$/.test(method)
      );
    }
    if (ts.isNewExpression(parent)) return /Error$/.test(parent.expression.getText());
    return false;
  });
}

function checkTs(file) {
  const text = fs.readFileSync(file, 'utf8');
  // A whole file of data that is not UI text (say why at the top).
  if (/i18n-ignore-file/.test(text)) return;
  const lines = text.split('\n');
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  function visit(node) {
    if (ts.isJsxText(node)) {
      const value = node.getText(sourceFile);
      if (/\p{L}{2,}/u.test(value)) report(file, lines, node, sourceFile, 'jsx text', value);
    } else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = node.name.getText(sourceFile);
      const value = node.initializer.text;
      const userFacing =
        name !== 'enterKeyHint' && (USER_FACING_ATTRIBUTES.has(name) || /(Label|Text|Title|Message|Placeholder|Hint)$/.test(name));
      if (userFacing && /\p{L}/u.test(value)) report(file, lines, node, sourceFile, `attribute ${name}`, value);
      else if (HEBREW.test(value)) report(file, lines, node, sourceFile, `attribute ${name}`, value);
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !ts.isJsxAttribute(node.parent)) {
      const value = node.text;
      const isKey = ts.isPropertyAssignment(node.parent) && node.parent.name === node;
      const isTypeLiteral = ts.isLiteralTypeNode(node.parent);
      // event.key === 'Enter', status === 'Done' … — compared, not shown.
      const isCompared = ts.isBinaryExpression(node.parent) && /^(===|!==|==|!=)$/.test(node.parent.operatorToken.getText(sourceFile));
      // A fixed locale ('en-GB') formats dates / numbers in one language: use the Intl helpers of @sistem/shared.
      if (/^[a-z]{2}-[A-Z]{2}$/.test(value) && !file.includes(`${path.sep}i18n${path.sep}`) && !/todayInTimezone|en-CA/.test(value)) {
        report(file, lines, node, sourceFile, 'fixed locale', value);
      }
      if (!isKey && !isTypeLiteral && !isCompared && !isTechnicalContext(node)) {
        if (HEBREW.test(value)) report(file, lines, node, sourceFile, 'string', value);
        else if (ENGLISH_PHRASE.test(value.trim())) report(file, lines, node, sourceFile, 'string', value);
        else if (SINGLE_WORD_LABEL.test(value.trim()) && isInside(node, (parent) => ts.isJsxExpression(parent))) {
          // {isDone ? 'Published' : 'Draft'} — a one-word label rendered in JSX.
          report(file, lines, node, sourceFile, 'string', value);
        } else if (SINGLE_WORD_LABEL.test(value.trim()) && ts.isPropertyAssignment(node.parent)) {
          // { label: 'Home' } — a one-word label in an object.
          const key = node.parent.name.getText(sourceFile);
          if (/label|title|text|name|placeholder|description|heading/i.test(key)) report(file, lines, node, sourceFile, 'string', value);
        }
      }
    } else if (ts.isTemplateExpression(node) && !isTechnicalContext(node)) {
      const parts = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ');
      // Class names ('profile-tag profile-tag-${variant}') and paths are not text.
      const looksTechnical = /^[a-z0-9_\-/.:?=&#\s]*$/.test(parts);
      // Shown as-is: a JSX child, or a user-facing attribute (aria-label={`${set} reps`}).
      const attribute = isInside(node, (parent) => ts.isJsxAttribute(parent))
        ? (() => {
            let parent = node.parent;
            while (parent && !ts.isJsxAttribute(parent)) parent = parent.parent;
            return parent ? parent.name.getText(sourceFile) : '';
          })()
        : null;
      const shownAsText =
        (attribute !== null && attribute !== 'className' && !/^aria-(labelledby|controls|describedby|owns)$/.test(attribute) && /^(aria-|alt$|title$|placeholder$)|(label|Label|Text|Title|Message)$/.test(attribute)) ||
        (attribute === null && renderedInJsx(node));
      if (HEBREW.test(parts) || (!looksTechnical && /[A-Za-z]{2,} [A-Za-z]{2,}/.test(parts)) || (shownAsText && /[A-Za-z]{2,}/.test(parts))) {
        report(file, lines, node, sourceFile, 'template', node.getText(sourceFile));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

// left / right as a physical side. Logical properties (inline-start / -end) follow the direction.
const PHYSICAL_CSS =
  /(^|[\s;{])(margin|padding|border)-(left|right)\b|(^|[\s;{])(left|right)\s*:|text-align\s*:\s*(left|right)\b|float\s*:\s*(left|right)\b|clear\s*:\s*(left|right)\b|border-(top|bottom)-(left|right)-radius/;

function checkCss(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    const code = line.replace(/\/\*.*?\*\//g, '');
    if (!PHYSICAL_CSS.test(code)) return;
    if (/physical:/.test(line) || /physical:/.test(lines[index - 1] ?? '')) return;
    findings.push(`${relative(file)}:${index + 1}: physical css: ${line.trim()}`);
  });
}

for (const source of SOURCES) {
  for (const file of walk(path.join(ROOT, source))) {
    const rel = relative(file);
    if (SKIPPED.some((prefix) => rel.startsWith(prefix))) continue;
    if (/\.(tsx?)$/.test(file) && !file.endsWith('.d.ts')) checkTs(file);
    else if (file.endsWith('.css')) checkCss(file);
  }
}
for (const file of walk(path.join(ROOT, 'packages/tokens')).filter((name) => name.endsWith('.css'))) checkCss(file);

if (findings.length > 0) {
  console.log(findings.join('\n'));
  console.log(`\ni18n audit: ${findings.length} finding(s). Move the text into a copy file, use logical CSS, or mark the line with i18n-ignore / physical: and a reason.`);
  process.exit(1);
}
console.log('i18n audit: no hard-coded UI text or physical CSS found.');
