#!/usr/bin/env node
// DEV ONLY color check — `node scripts/check-colors.mjs`. No dependency. Lists:
//   1. hex colors in apps/ and packages/ source that are not in the token palette
//      (packages/tokens/tokens.css) — every color must come from a token;
//   2. palette tokens in the brown / gold / amber / ochre / tan family (and darkened orange), with
//      every file that reads them. The owner's rule: none of these anywhere. The orange TEXT tone
//      #c75a00 (on light orange tints, never a fill) is the one allowed exception.
// Exits 1 when either list has an entry, so it can join `npm run lint` later.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TOKENS_FILE = 'packages/tokens/tokens.css';
const SOURCES = ['apps', 'packages'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.vite', 'android', 'ios', 'public']);
const EXTENSIONS = new Set(['.css', '.ts', '.tsx', '.js', '.mjs', '.html']);
const ALLOWED_WARM = new Set(['#c75a00']);
const HEX = /(?<![\w&#])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;

function normalize(hex) {
  let value = hex.toLowerCase().slice(1);
  if (value.length === 3 || value.length === 4) value = [...value].map((c) => c + c).join('');
  return `#${value.slice(0, 6)}`;
}

function toHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

/** Brown, gold, amber, ochre, tan or a darkened orange. Bright brand orange (#ff7a00) and light peach tints pass. */
function isWarmMuddy(hex) {
  if (ALLOWED_WARM.has(hex)) return false;
  const { h, s, l } = toHsl(hex);
  if (h < 15 || h > 55 || s < 0.15) return false;
  const brightOrange = s >= 0.9 && l >= 0.48 && h < 34;
  if (brightOrange) return false;
  return l < 0.6 || (s < 0.65 && l < 0.85);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) walk(path.join(dir, entry.name), files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

// The palette: every hex in tokens.css, with the token(s) that hold it.
const tokensText = fs.readFileSync(path.join(ROOT, TOKENS_FILE), 'utf8');
const palette = new Map();
for (const line of tokensText.split('\n')) {
  const name = line.match(/^\s*(--[\w-]+)\s*:/)?.[1];
  for (const match of line.matchAll(HEX)) {
    const hex = normalize(match[0]);
    if (!palette.has(hex)) palette.set(hex, new Set());
    if (name) palette.get(hex).add(name);
  }
}

const files = SOURCES.flatMap((dir) => walk(path.join(ROOT, dir))).filter((file) => path.relative(ROOT, file) !== TOKENS_FILE);

// 1. Hex colors outside the palette.
const offPalette = [];
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (line.includes('check-colors-ignore')) return;
    for (const match of line.matchAll(HEX)) {
      const hex = normalize(match[0]);
      if (!palette.has(hex) || isWarmMuddy(hex)) offPalette.push(`${path.relative(ROOT, file)}:${index + 1}  ${match[0]}${isWarmMuddy(hex) ? '  (brown / gold)' : ''}`);
    }
  });
}

// 2. Brown / gold tokens and who reads them.
const warmTokens = [...palette].filter(([hex]) => isWarmMuddy(hex)).flatMap(([hex, names]) => [...names].map((name) => ({ hex, name })));
// Tokens that only alias a warm token (--a: var(--warm)) count too.
for (const line of tokensText.split('\n')) {
  const alias = line.match(/^\s*(--[\w-]+)\s*:\s*var\((--[\w-]+)\)\s*;/);
  if (alias && warmTokens.some((token) => token.name === alias[2]) && !warmTokens.some((token) => token.name === alias[1])) {
    warmTokens.push({ hex: warmTokens.find((token) => token.name === alias[2]).hex, name: alias[1] });
  }
}
const warmReport = warmTokens.map(({ hex, name }) => {
  const pattern = new RegExp(`var\\(${name}[,)]`);
  const users = files.filter((file) => pattern.test(fs.readFileSync(file, 'utf8'))).map((file) => path.relative(ROOT, file));
  return { hex, name, users };
});

console.log(`Color check: ${palette.size} palette colors, ${files.length} files.\n`);
console.log(`1. Hex colors not in the token palette (or brown / gold): ${offPalette.length}`);
for (const hit of offPalette) console.log(`  ${hit}`);
console.log(`\n2. Brown / gold / amber / tan tokens (allowed: ${[...ALLOWED_WARM].join(', ')} as orange text): ${warmReport.length}`);
for (const { hex, name, users } of warmReport) {
  console.log(`  ${name}: ${hex} — ${users.length ? `used in ${users.length} file(s)` : 'unused'}`);
  for (const user of users) console.log(`      ${user}`);
}
process.exitCode = offPalette.length || warmReport.length ? 1 : 0;
