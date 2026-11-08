import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/database.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  "    const result = await db().query('SELECT account_email FROM redaction_rh.account_links WHERE collaborator_id=$1', [collaboratorId]);\n    await pushRhDecision(result.rows[0]?.account_email ?? null, type);",
  "    const result = await db().query('SELECT account_email FROM redaction_rh.account_links WHERE collaborator_id=$1', [collaboratorId]);\n    const email = result.rows[0]?.account_email ?? null;\n    const [{ rhNotificationPush }, { sendRhNotificationEmail }] = await Promise.all([\n      import('./notifications'),\n      import('./notification-email'),\n    ]);\n    const payload = rhNotificationPush(type);\n    await Promise.allSettled([\n      pushRhDecision(email, type),\n      email ? sendRhNotificationEmail(email, payload) : Promise.resolve(false),\n    ]);",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('sendRhNotificationEmail') ? 'OK' : 'MISS');
