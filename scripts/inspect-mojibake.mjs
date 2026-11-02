import fs from 'node:fs';
import path from 'node:path';

const seen = new Set();
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      const regex = /[\u00c3\u00e2\u00c2][^\s'"`<>]{1,10}/g;
      let match;
      while ((match = regex.exec(text))) {
        const value = match[0];
        const codes = [...value].map((char) => char.codePointAt(0).toString(16)).join(' ');
        const key = `${JSON.stringify(value)} ${codes}`;
        if (!seen.has(key)) {
          seen.add(key);
          console.log(key);
        }
      }
    }
  }
}
walk(path.join(process.cwd(), 'apps/redaction/src'));
