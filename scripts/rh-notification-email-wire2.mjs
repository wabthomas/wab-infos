import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/database.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const index = lines.findIndex(line => line.includes('await pushRhDecision(result.rows[0]?.account_email ?? null, type);'));
if (index < 0) { console.log('MISS'); process.exit(1); }
lines.splice(index, 1,
  '    const email = result.rows[0]?.account_email ?? null;',
  '    const [{ rhNotificationPush }, { sendRhNotificationEmail }] = await Promise.all([',
  "      import('./notifications'),",
  "      import('./notification-email'),",
  '    ]);',
  '    const payload = rhNotificationPush(type);',
  '    await Promise.allSettled([',
  '      pushRhDecision(email, type),',
  '      email ? sendRhNotificationEmail(email, payload) : Promise.resolve(false),',
  '    ]);',
);
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(lines.some(line => line.includes('sendRhNotificationEmail')) ? 'OK' : 'MISS');
