import fs from 'node:fs';
import path from 'node:path';

const cp1252 = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

function charToByte(char) {
  const code = char.codePointAt(0);
  if (code <= 0xff) return code;
  return cp1252.get(code) ?? -1;
}

const decoder = new TextDecoder('utf-8', { fatal: true });

function fixOnce(text) {
  let output = '';
  let index = 0;
  while (index < text.length) {
    let replaced = false;
    // Try longest first so multi-byte layers collapse in one pass.
    for (let length = 6; length >= 2; length -= 1) {
      if (index + length > text.length) continue;
      const candidate = text.slice(index, index + length);
      const bytes = [];
      let valid = true;
      for (const char of candidate) {
        const byte = charToByte(char);
        if (byte < 0) { valid = false; break; }
        bytes.push(byte);
      }
      if (!valid) continue;
      let decoded;
      try {
        decoded = decoder.decode(Uint8Array.from(bytes));
      } catch {
        continue;
      }
      if (!decoded || decoded === candidate || decoded.length >= candidate.length) continue;
      if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(decoded)) continue;
      output += decoded;
      index += length;
      replaced = true;
      break;
    }
    if (!replaced) {
      output += text[index];
      index += 1;
    }
  }
  return output;
}

function fix(text) {
  let value = text;
  for (let pass = 0; pass < 6; pass += 1) {
    const next = fixOnce(value);
    if (next === value) break;
    value = next;
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
