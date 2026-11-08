import fs from 'node:fs';
const file = 'tests/rh-notifications.test.mjs';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.includes("test('messages"));
if (start < 0) { console.log('MISS_START'); process.exit(1); }
let end = start + 1;
while (end < lines.length && lines[end].trim() !== '});') end += 1;
const replacement = [
  "test('messages de notification distincts et sans montant', () => {",
  "  const remuneration = rhNotificationMessage('remuneration');",
  "  const retrait = rhNotificationMessage('retrait');",
  '  assert.notEqual(remuneration, retrait);',
  '  assert.match(remuneration, /rémunération/i);',
  '  assert.match(retrait, /retrait/i);',
  '  assert.doesNotMatch(remuneration, /CDF|USD|\\d/i);',
  "  assert.match(rhNotificationMessage('absence'), /demande/);",
  "  assert.match(rhNotificationMessage('prestation'), /déclaration/);",
  '});',
];
lines.splice(start, end - start + 1, ...replacement);
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('OK');
