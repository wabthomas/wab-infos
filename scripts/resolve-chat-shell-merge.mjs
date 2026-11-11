import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/redaction-shell.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> origin\/arena\/560e4c63-wab-infos\r?\n/,
  (_m, ours) => ours.replace('{inMyRh ? <>', '{inChat ? null : inMyRh ? <>'),
);
fs.writeFileSync(file, text, 'utf8');
console.log(!text.includes('<<<<<<<') ? 'OK' : 'STILL');
