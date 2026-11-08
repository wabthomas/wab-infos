import fs from 'node:fs';

function patchLines(file, fn) {
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  fn(lines);
  fs.writeFileSync(file, lines.join(eol), 'utf8');
}

// database.ts
const dbFile = 'apps/redaction/src/lib/redaction/rh/database.ts';
patchLines(dbFile, (lines) => {
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes('async function queueRhNotification(')) lines[i] = lines[i].replace('async function queueRhNotification(', 'export async function queueRhNotification(');
    if (lines[i].includes("queueRhNotification(client, result.rows[0].collaboratorId, 'absence'")) {
      lines[i] = lines[i].replace("'absence'", "result.rows[0].status === 'approved' ? 'absence_approved' : 'absence_rejected'");
    }
    if (lines[i].includes("pushRhDecision(link.rows[0]?.account_email ?? null, 'absence')")) {
      lines[i] = lines[i].replace("'absence')", "result.rows[0].status === 'approved' ? 'absence_approved' : 'absence_rejected')");
    }
    if (lines[i].includes("queueRhNotification(client, collaboratorId, 'prestation', submissionId")) {
      lines[i] = lines[i].replace("'prestation'", "decision === 'approve' ? 'prestation_approved' : 'prestation_rejected'");
    }
    if (lines[i].includes("'document_create', input.collaboratorId, id]")) {
      lines.splice(i + 1, 0, "    if (input.share) await queueRhNotification(client, input.collaboratorId, 'document_available', id, 1);");
      i += 1;
    }
    if (lines[i].includes("queueManagementEvent(client, 'contestation', result.rows[0].id);")) {
      lines.splice(i + 1, 0, "    await queueRhNotification(client, id, 'dispute_created', result.rows[0].id, 1);");
      i += 1;
    }
  }
});
console.log('DATABASE', fs.readFileSync(dbFile, 'utf8').includes('absence_approved') && fs.readFileSync(dbFile, 'utf8').includes('dispute_created') ? 'OK' : 'MISS');

// attendance corrections
const correctionsFile = 'apps/redaction/src/lib/redaction/rh/attendance-corrections-db.ts';
patchLines(correctionsFile, (lines) => {
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes("import { db } from './database';")) lines[i] = lines[i].replace("import { db } from './database';", "import { db, queueRhNotification } from './database';");
    if (lines[i].includes("'attendance_correction_request'")) {
      lines.splice(i + 1, 0, "    await queueRhNotification(client, person, 'attendance_correction_requested', result.rows[0].id, 1);");
      i += 1;
    }
  }
});
console.log('CORRECTIONS', fs.readFileSync(correctionsFile, 'utf8').includes('attendance_correction_requested') ? 'OK' : 'MISS');
