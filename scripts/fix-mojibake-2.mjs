import fs from 'node:fs';
import path from 'node:path';

const pairs = [
  ['\u00c3\u2030', '\u00c9'],
  ['\u00c3\u201a\u00b7', '\u00b7'],
  ['\u00c3\u0192\u00e2\u20ac\u00b0', '\u00c9'],
  ['\u00e2\u00e2\u201a\u00ac\u201d', '\u2014'],
  ['\u00e2\u00e2\u201a\u00ac\u00e2\u201e\u00a2', '\u2019'],
  ['\u00e2\u00e2\u201a\u00ac\u00c2\u00a6', '\u2026'],
  ['\u00c3\u0192\u00c2\u00a9', '\u00e9'],
  ['\u00c3\u00a9', '\u00e9'],
  ['\u00c3\u0192\u00c2\u00a8', '\u00e8'],
  ['\u00c3\u00a8', '\u00e8'],
  ['\u00c3\u00a0', '\u00e0'],
  ['\u00c3\u00a7', '\u00e7'],
  ['\u00c3\u00aa', '\u00ea'],
  ['\u00c3\u00ae', '\u00ee'],
  ['\u00c3\u00b4', '\u00f4'],
  ['\u00c3\u00bb', '\u00fb'],
  ['\u00c3\u00b9', '\u00f9'],
  ['\u00e2\u20ac\u2122', '\u2019'],
  ['\u00e2\u20ac\u201c', '\u2013'],
  ['\u00e2\u20ac\u201d', '\u2014'],
  ['\u00c2\u00b7', '\u00b7'],
  ['\u00c2\u00a0', ' '],
];

function fix(text) {
  let value = text;
  for (let pass = 0; pass < 5; pass += 1) {
    const before = value;
    for (const [from, to] of pairs) value = value.split(from).join(to);
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
