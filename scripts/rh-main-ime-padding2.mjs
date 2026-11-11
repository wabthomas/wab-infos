import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/redaction-shell.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const id = lines.findIndex(line => line.trim() === 'id="redaction-main-scroll"');
if (id >= 0 && !lines.some(line => line.includes('--wab-ime-bottom'))) {
  lines.splice(id, 0, "          style={(inRh || inMyRh) && !inChat ? { paddingBottom: 'var(--wab-ime-bottom, 0px)' } : undefined}");
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(lines.some(line => line.includes('--wab-ime-bottom')) ? 'OK' : 'MISS');
