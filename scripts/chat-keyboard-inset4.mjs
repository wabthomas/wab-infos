import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/chat.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.trim() === 'const viewportBottom = isNative');
if (start < 0) { console.log('MISS'); process.exit(1); }
lines.splice(start, 3,
  '      const visualBottom = (visual?.height ?? window.innerHeight) + (visual?.offsetTop ?? 0);',
  '      const nativeBottom = window.innerHeight - Math.max(0, keyboardInset);',
  '      // min() couvre les deux comportements Android : WebView redimensionnée (visualViewport)',
  '      // ou clavier superposé (insets IME natifs). On ne peut ainsi jamais dépasser sous le clavier.',
  '      const viewportBottom = isNative ? Math.max(120, Math.min(nativeBottom, visualBottom)) : visualBottom;',
);
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('OK');
