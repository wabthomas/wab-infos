import fs from 'node:fs';
// Manager : push + e-mail
const dbFile = 'apps/redaction/src/lib/redaction/rh/database.ts';
const dbEol = fs.readFileSync(dbFile, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const dbLines = fs.readFileSync(dbFile, 'utf8').split(/\r?\n/);
const idx = dbLines.findIndex(line => line.includes("const [{ rhManagerPush }, { notifyCollaboratorByEmail }]"));
if (idx >= 0) {
  dbLines[idx] = "    const [{ rhManagerPush }, { notifyCollaboratorByEmail }, { sendRhNotificationEmail }] = await Promise.all([import('./notifications'), import('../web-push'), import('./notification-email')]);";
  const next = dbLines.findIndex((line, i) => i > idx && line.includes('notifyCollaboratorByEmail(row.email'));
  if (next >= 0) {
    dbLines[next] = "    const message = rhManagerPush(type);\n    await Promise.all(rows.rows.flatMap((row) => [notifyCollaboratorByEmail(row.email, message), sendRhNotificationEmail(row.email, message)]));";
  }
}
fs.writeFileSync(dbFile, dbLines.join(dbEol), 'utf8');
console.log('MANAGER', fs.readFileSync(dbFile, 'utf8').includes('sendRhNotificationEmail(row.email') ? 'OK' : 'MISS');

// Signature collaborateur : alerte de confirmation
const signFile = 'apps/redaction/src/app/api/redaction/rh/mon-espace/contrats/[id]/route.ts';
const signEol = fs.readFileSync(signFile, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const signLines = fs.readFileSync(signFile, 'utf8').split(/\r?\n/);
const signIdx = signLines.findIndex(line => line.includes("pushContractAlert([row.prepared_by], 'signed')"));
if (signIdx >= 0) signLines.splice(signIdx + 1, 0, "        await pushContractAlert([principal.email], 'signedEmployee');");
fs.writeFileSync(signFile, signLines.join(signEol), 'utf8');
console.log('SIGN', fs.readFileSync(signFile, 'utf8').includes("'signedEmployee'") ? 'OK' : 'MISS');
