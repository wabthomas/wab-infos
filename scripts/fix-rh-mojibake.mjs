import fs from 'node:fs';
import path from 'node:path';

const pairs = [
  // triple-encoded accents (ÃƒÂ©)
  ['\u00c3\u0192\u00c2\u00a9', '\u00e9'],
  ['\u00c3\u0192\u00c2\u00a8', '\u00e8'],
  ['\u00c3\u0192\u00c2\u00a0', '\u00e0'],
  ['\u00c3\u0192\u00c2\u00a7', '\u00e7'],
  ['\u00c3\u0192\u00c2\u00aa', '\u00ea'],
  ['\u00c3\u0192\u00c2\u00ae', '\u00ee'],
  ['\u00c3\u0192\u00c2\u00b4', '\u00f4'],
  ['\u00c3\u0192\u00c2\u00bb', '\u00fb'],
  ['\u00c3\u0192\u00c2\u00b9', '\u00f9'],
  ['\u00c3\u0192\u00c2\u00a9', '\u00e9'],
  // double-encoded accents (Ã©)
  ['\u00c3\u00a9', '\u00e9'],
  ['\u00c3\u00a8', '\u00e8'],
  ['\u00c3\u00a0', '\u00e0'],
  ['\u00c3\u00a7', '\u00e7'],
  ['\u00c3\u00aa', '\u00ea'],
  ['\u00c3\u00ae', '\u00ee'],
  ['\u00c3\u00b4', '\u00f4'],
  ['\u00c3\u00bb', '\u00fb'],
  ['\u00c3\u00b9', '\u00f9'],
  ['\u00c3\u00ab', '\u00eb'],
  ['\u00c3\u00af', '\u00ef'],
  ['\u00c3\u00a2', '\u00e2'],
  ['\u00c3\u0089', '\u00c9'],
  ['\u00c3\u0087', '\u00c7'],
  ['\u00c3\u0080', '\u00c0'],
  // punctuation
  ['\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u201e\u00a2', '\u2019'],
  ['\u00e2\u20ac\u2122', '\u2019'],
  ['\u00e2\u20ac\u02dc', '\u2018'],
  ['\u00e2\u20ac\u0153', '\u201c'],
  ['\u00e2\u20ac\u009d', '\u201d'],
  ['\u00e2\u20ac\u201c', '\u2013'],
  ['\u00e2\u20ac\u201d', '\u2014'],
  ['\u00e2\u20ac\u00a6', '\u2026'],
  ['\u00e2\u2020\u2019', '\u2192'],
  ['\u00c2\u00b7', '\u00b7'],
  ['\u00c2\u00bb', '\u00bb'],
  ['\u00c2\u00ab', '\u00ab'],
  ['\u00c2\u00a0', ' '],
  ['\u00c2\u00ab', '\u00ab'],
];

function fix(text) {
  let value = text;
  for (let pass = 0; pass < 5; pass += 1) {
    const before = value;
    for (const [from, to] of pairs) {
      if (value.includes(from)) value = value.split(from).join(to);
    }
    if (value === before) break;
  }
  return value;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      const next = fix(text);
      if (next !== text) {
        fs.writeFileSync(full, next, 'utf8');
        console.log('fixed', path.relative(process.cwd(), full));
      }
    }
  }
}

walk(path.join(process.cwd(), 'apps/redaction/src'));

const shell = path.join(process.cwd(), 'apps/redaction/src/components/redaction/redaction-shell.tsx');
let source = fs.readFileSync(shell, 'utf8');
source = source.split('className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 font-display text-lg font-bold text-primary-foreground shadow-md shadow-primary/25"').join('className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-md shadow-primary/25"');
source = source.replace(/(\n\s*)W(\n\s*<\/Link>)/, '$1<img src="/logo.png" alt="Wab-infos" className="h-full w-full object-contain" />$2');
fs.writeFileSync(shell, source, 'utf8');
