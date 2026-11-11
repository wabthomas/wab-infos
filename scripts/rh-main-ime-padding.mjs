import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/redaction-shell.tsx';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('--wab-ime-bottom')) {
  text = text.replace(
    '<main\n',
    '<main\n          style={(inRh || inMyRh) && !inChat ? { paddingBottom: \'var(--wab-ime-bottom, 0px)\' } : undefined}\n',
  );
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('--wab-ime-bottom') ? 'OK' : 'MISS');
