import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps/redaction/src');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?)$/.test(entry.name)) {
      let content = fs.readFileSync(full, 'utf8');
      const next = content
        .replaceAll('/redaction/articles?', '/articles?')
        .replaceAll('/redaction/articles/', '/articles/')
        .replaceAll('/redaction/stats', '/stats')
        .replaceAll('/redaction/nouveau', '/nouveau');
      if (content !== next) fs.writeFileSync(full, next);
    }
  }
}

walk(root);
console.info('fixed paths');
