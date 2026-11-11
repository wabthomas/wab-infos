import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/chat.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.includes('const group = rooms.find'));
const end = lines.findIndex((line, i) => i >= start && line.includes('const mobileRooms ='));
if (start < 0 || end < 0) { console.log('MISS'); process.exit(1); }
lines.splice(start, end - start + 1,
  "  const group = rooms.find(item => item.kind === 'group');",
  "  // Une seule conversation privée par contact (comme WhatsApp), même si une ancienne base en contient plusieurs.",
  "  const uniquePrivate = [...new Map(rooms.filter(item => item.kind === 'private' && item.photoId).sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')).map(item => [item.photoId as string, item])).values()];",
  '  const conversations = uniquePrivate;',
  "  const mobileRooms = [...rooms.filter(item => item.kind !== 'private'), ...uniquePrivate].sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));",
);
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('OK');
