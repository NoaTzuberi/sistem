#!/usr/bin/env node
// Contrast check (WCAG AA) — runs with `npm run lint`. No dependency.
//
// Reads packages/tokens/tokens.css, then every CSS file in apps/mobile/src and apps/dashboard/src, and
// fails when a rule:
//   1. sets white text (or a white-at-an-alpha token) on a background lighter than 3:1 against white —
//      the "known light tokens" (tints, clouds, light identity colors);
//   2. sets text and a solid background that resolve to less than 3:1 (4.5:1 when the same rule
//      declares a font-size under 14px);
//   3. fades a white-text control with opacity in a disabled state (use --disabled-bg / --disabled-ink).
// Local color variables (--workout-color, --ach-color, …) are checked against every value any CSS
// file assigns to them. Gradients and anything else it can't resolve are skipped — check those by eye.
// A declaration with `contrast-ignore` on its line (say why) is skipped.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TOKENS_FILE = 'packages/tokens/tokens.css';
const SOURCES = ['apps/mobile/src', 'apps/dashboard/src'];
const WHITE = [255, 255, 255];

// ── Colors ────────────────────────────────────────────────────────────────────

function parseHex(value) {
  let hex = value.slice(1);
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
  if (hex.length !== 6) return null;
  return { rgb: [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)), alpha: 1 };
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// A color at an alpha, shown over white (surfaces are white or near-white).
function flatten({ rgb, alpha }, under = WHITE) {
  return rgb.map((c, i) => Math.round(c * alpha + under[i] * (1 - alpha)));
}

function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (text[i] === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts;
}

// → { rgb, alpha } or null (gradient, currentColor, unknown variable…). `locals` maps a local
// variable to one of its values (the caller tries each).
function resolve(value, vars, locals = {}, depth = 0) {
  if (!value || depth > 20) return null;
  value = value.replace(/\s*!important$/, '').trim();
  if (/^#[0-9a-f]{3,6}$/i.test(value)) return parseHex(value);
  if (value === 'white') return { rgb: WHITE, alpha: 1 };
  if (value === 'transparent') return { rgb: WHITE, alpha: 0 };
  const variable = value.match(/^var\((--[\w-]+)(?:,\s*(.+))?\)$/);
  if (variable) {
    const [, name, fallback] = variable;
    const next = locals[name] ?? vars[name] ?? fallback;
    return resolve(next, vars, locals, depth + 1);
  }
  const mix = value.match(/^color-mix\(in srgb,\s*(.+)\)$/);
  if (mix) {
    const parts = splitTopLevel(mix[1]).map((part) => {
      const m = part.match(/^(.*?)\s+(\d+(?:\.\d+)?)%$/);
      return m ? { color: m[1], pct: Number(m[2]) / 100 } : { color: part, pct: null };
    });
    if (parts.length !== 2) return null;
    const [a, b] = parts;
    const pa = a.pct ?? (b.pct === null ? 0.5 : 1 - b.pct);
    const ca = resolve(a.color, vars, locals, depth + 1);
    const cb = resolve(b.color, vars, locals, depth + 1);
    if (!ca || !cb) return null;
    const alpha = ca.alpha * pa + cb.alpha * (1 - pa);
    if (alpha === 0) return { rgb: WHITE, alpha: 0 };
    const rgb = ca.rgb.map((c, i) => Math.round((c * ca.alpha * pa + cb.rgb[i] * cb.alpha * (1 - pa)) / alpha));
    return { rgb, alpha };
  }
  return null;
}

// ── CSS parsing ───────────────────────────────────────────────────────────────

function readRules(file) {
  const source = fs.readFileSync(file, 'utf8');
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = re.exec(source))) {
    const selector = match[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const line = source.slice(0, match.index + match[0].indexOf('{')).split('\n').length;
    const declarations = {};
    const ignored = new Set();
    for (const text of match[2].split('\n')) {
      if (text.includes('contrast-ignore')) ignored.add(text.match(/^\s*([\w-]+)\s*:/)?.[1]);
    }
    for (const raw of match[2].replace(/\/\*[\s\S]*?\*\//g, '').split(';')) {
      const colon = raw.indexOf(':');
      if (colon < 0) continue;
      declarations[raw.slice(0, colon).trim()] = raw.slice(colon + 1).trim();
    }
    rules.push({ file, selector, line, declarations, ignored });
  }
  return rules;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(full, files);
    } else if (entry.name.endsWith('.css')) files.push(full);
  }
  return files;
}

const tokenRules = readRules(path.join(ROOT, TOKENS_FILE)).filter((rule) => rule.selector === ':root');
const vars = Object.assign({}, ...tokenRules.map((rule) => rule.declarations));

const files = SOURCES.flatMap((dir) => walk(path.join(ROOT, dir)));
const rules = files.flatMap(readRules);

// The local color variables each app rule sets together (.workout-color-3 { --workout-color; --workout-color-soft }),
// and the first value seen for each one (its default, e.g. `.notice { --notice-color }`).
const groups = [];
const defaults = {};
for (const rule of rules) {
  const group = Object.fromEntries(Object.entries(rule.declarations).filter(([property]) => property.startsWith('--')));
  if (!Object.keys(group).length) continue;
  groups.push(group);
  for (const [name, value] of Object.entries(group)) defaults[name] ??= value;
}

// The variable sets a color pair can meet: the defaults, then each rule's set on top of them.
function variants(...values) {
  const names = new Set(values.join(' ').match(/--[\w-]+/g) ?? []);
  const local = (group) => Object.fromEntries(Object.entries(group).filter(([name]) => names.has(name)));
  return [local(defaults), ...groups.filter((group) => Object.keys(group).some((name) => names.has(name))).map((group) => ({ ...local(defaults), ...local(group) }))];
}

function isWhite(color) {
  return color && contrast(flatten(color), WHITE) < 1.25;
}

function background(declarations) {
  const value = declarations['background-color'] ?? declarations.background;
  return value && !/gradient|url\(/.test(value) ? value : null;
}

function smallText(declarations) {
  const size = declarations['font-size'];
  if (!size) return false;
  const name = size.match(/^var\((--[\w-]+)\)$/)?.[1];
  const px = (name ? vars[name] : size)?.match(/^(\d+(?:\.\d+)?)px$/);
  return px ? Number(px[1]) < 14 : false;
}

const lightTokens = Object.keys(vars).filter((name) => {
  const color = resolve(`var(${name})`, vars);
  return color && color.alpha === 1 && !isWhite(color) && contrast(color.rgb, WHITE) < 3;
});

// The owner's orange text tone (--ink-orange #c75a00) on light orange tints: chosen over any darker
// (brown) orange (owner, 2026-10-22). It reads 3.7–4.3:1 — accepted down to 3.5:1, never lower.
const OWNER_ORANGE_TEXT = [199, 90, 0];
const OWNER_ORANGE_MIN = 3.5;
const isOwnerOrange = (color) => color.rgb.every((channel, index) => channel === OWNER_ORANGE_TEXT[index]);

const findings = [];
const report = (rule, message) =>
  findings.push(`${path.relative(ROOT, rule.file)}:${rule.line}  ${rule.selector.split('\n').pop()}  — ${message}`);

for (const rule of rules) {
  const { declarations } = rule;
  const text = declarations.color;
  const back = background(declarations);
  if (!text || !back || rule.ignored.has('color')) continue;
  for (const locals of variants(text, back)) {
    const fg = resolve(text, vars, locals);
    const bg = resolve(back, vars, locals);
    if (!fg || !bg || bg.alpha < 1) continue;
    const ratio = contrast(flatten(fg, bg.rgb), bg.rgb);
    const needed = isOwnerOrange(fg) ? Math.min(OWNER_ORANGE_MIN, smallText(declarations) ? 4.5 : 3) : smallText(declarations) ? 4.5 : 3;
    if (ratio < needed) {
      const used = Object.values(locals).join(', ');
      report(rule, `${isWhite(fg) ? 'white text' : 'text'} on ${back}${used ? ` (${used})` : ''} is ${ratio.toFixed(2)}:1, needs ${needed}:1`);
      break;
    }
  }
}

// Base classes that put white text on a fill: their disabled state must not just fade.
const whiteClasses = new Set();
for (const rule of rules) {
  const fg = resolve(rule.declarations.color, vars);
  if (isWhite(fg) && background(rule.declarations)) {
    for (const cls of rule.selector.match(/\.[\w-]+/g) ?? []) whiteClasses.add(cls);
  }
}
for (const rule of rules) {
  if (!/:disabled|aria-disabled/.test(rule.selector) || rule.ignored.has('opacity')) continue;
  const opacity = rule.declarations.opacity;
  if (!opacity || opacity === '1') continue;
  const classes = rule.selector.split(',').map((part) => part.trim().match(/^\.[\w-]+/)?.[0]);
  if (classes.some((cls) => cls && whiteClasses.has(cls) && /primary|publish|submit|apply|solid/.test(cls))) {
    report(rule, `fades white text with opacity when disabled — use --disabled-bg / --disabled-ink`);
  }
}

if (findings.length) {
  console.error(`Contrast audit: ${findings.length} finding(s).\n`);
  for (const line of findings) console.error(`  ${line}`);
  console.error(`\nKnown light tokens (under 3:1 with white text): ${lightTokens.join(', ')}`);
  console.error('Use a --solid-* fill under white text, or an --ink-* on its --tint-* (packages/tokens/tokens.css).');
  process.exit(1);
}
console.log(`Contrast audit: ${rules.length} rules in ${files.length} files, no findings.`);
