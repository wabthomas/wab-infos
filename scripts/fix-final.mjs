import fs from 'node:fs';
import path from 'node:path';

const pairs = [
  ['\u00c3\u00a9', '\u00e9'], ['\u00c3\u00a8', '\u00e8'], ['\u00c3\u00a0', '\u00e0'],
  ['\u00c3\u00a7', '\u00e7'], ['\u00c3\u00aa', '\u00ea'], ['\u00c3\u00ae', '\u00ee'],
  ['\u00c3\u00b4', '\u00f4'], ['\u00c3\u00bb', '\u00fb'], ['\u00c3\u00b9', '\u00f9'],
  ['\u00c3\u00ab', '\u00eb'], ['\u00c3\u00af', '\u00ef'], ['\u00c3\u00a2', '\u00e2'],
  ['\u00c3\u0089', '\u00c9'], ['\u00c3\u0087', '\u00c7'], ['\u00c3\u0080', '\u00c0'],
  ['\u00e2\u20ac\u2122', '\u2019'], ['\u00e2\u20ac\u02dc', '\u2018'],
  ['\u00e2\u20ac\u0153', '\u201c'], ['\u00e2\u20ac\u009d', '\u201d'],
  ['\u00e2\u20ac\u201c', '\u2013'], ['\u00e2\u20ac\u201d', '\u2014'],
  ['\u00e2\u20ac\u00a6', '\u2026'], ['\u00c2\u00b7', '\u00b7'],
  ['\u00c2\u00a0', ' '], ['\u00c2\u00ab', '\u00ab'], ['\u00c2\u00bb', '\u00bb'],
  ['\u00c3\u0192\u00c2\u00a9', '\u00e9'],
];

function fix(value) {
  let text = value;
  for (let pass = 0; pass < 8; pass += 1) {
    const before = text;
    for (const [from, to] of pairs) text = text.split(from).join(to);
    if (text === before) break;
  }
  return text;
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
