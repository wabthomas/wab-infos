import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/chat.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.trim() === 'const visualBottom =');
if (start < 0) { console.log('MISS'); process.exit(1); }
let end = start;
while (end < lines.length && !lines[end].includes('const viewportBottom =')) end += 1;
lines.splice(start, end - start + 1,
  '      const visualBottom = (visual?.height ?? window.innerHeight) + (visual?.offsetTop ?? 0);',
  '      const keyboardBottom = window.innerHeight - Math.max(0, keyboardInset);',
  '      // Couvre navigateur (visualViewport) et APK edge-to-edge (IME natif superposé).',
  '      // Le minimum évite tout dépassement sous le clavier sans double décrément.',
  '      const viewportBottom = Math.max(120, Math.min(visualBottom, keyboardBottom));',
);
lines = lines.filter(line => !line.includes("import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';") && !line.trim().startsWith('const isNative = isNativeCapacitorFromUserAgent();'));
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('OK');
