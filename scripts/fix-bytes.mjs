import fs from 'node:fs';
import path from 'node:path';

const replacements = [
  ['c383c2a9', 'c3a9'], ['c383c2a8', 'c3a8'], ['c383c2a0', 'c3a0'], ['c383c2a7', 'c3a7'],
  ['c383c2aa', 'c3aa'], ['c383c2ae', 'c3ae'], ['c383c2b4', 'c3b4'], ['c383c2bb', 'c3bb'],
  ['c383c2b9', 'c3b9'], ['c383c2ab', 'c3ab'], ['c383c2af', 'c3af'], ['c383c2a2', 'c3a2'],
  ['c383c289', 'c389'], ['c383c287', 'c387'], ['c383c280', 'c380'],
  ['c3a2c280c299', 'e28099'], ['c3a2c280c298', 'e28098'],
  ['c3a2c280c29c', 'e2809c'], ['c3a2c280c29d', 'e2809d'],
  ['c3a2c280c293', 'e28093'], ['c3a2c280c294', 'e28094'],
  ['c3a2c280c2a6', 'e280a6'], ['c3a2c280c2a2', 'e280a2'],
  ['c382c2b7', 'c2b7'], ['c382c2a0', '20'], ['c382c2ab', 'c2ab'], ['c382c2bb', 'c2bb'],
];

function fix(buffer) {
  let bytes = buffer;
  for (let pass = 0; pass < 6; pass += 1) {
    const before = bytes.toString('hex');
    let hex = before;
    for (const [from, to] of replacements) hex = hex.split(from).join(to);
    if (hex === before) break;
    bytes = Buffer.from(hex, 'hex');
  }
  return bytes;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|css|json|md)$/.test(entry.name)) {
      const original = fs.readFileSync(full);
      const fixed = fix(original);
      if (!fixed.equals(original)) {
        fs.writeFileSync(full, fixed);
        console.log('fixed', path.relative(process.cwd(), full));
      }
    }
  }
}

walk(path.join(process.cwd(), 'apps/redaction/src'));
