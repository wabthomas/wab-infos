import fs from 'node:fs';
const file = 'tests/rh-notifications.test.mjs';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  "const remuneration = rhNotificationMessage('remuneration');\nassert.equal(remuneration, rhNotificationMessage('retrait'));",
  "const remuneration = rhNotificationMessage('remuneration');\nassert.notEqual(remuneration, rhNotificationMessage('retrait'));\nassert.match(remuneration, /rémunération/i);\nassert.match(rhNotificationMessage('retrait'), /retrait/i);",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('notEqual') ? 'OK' : 'MISS');
