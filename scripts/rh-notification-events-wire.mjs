import fs from 'node:fs';

// 1) Exporter la mise en file interne.
let db = fs.readFileSync('apps/redaction/src/lib/redaction/rh/database.ts', 'utf8');
db = db.replace('async function queueRhNotification(', 'export async function queueRhNotification(');

// 2) Absence : type selon la décision.
db = db.replace(
  "    await queueRhNotification(client, result.rows[0].collaboratorId, 'absence', id, result.rows[0].version);\n    const link = await client.query('SELECT account_email FROM redaction_rh.account_links WHERE collaborator_id=$1', [result.rows[0].collaboratorId]);\n    await client.query('COMMIT');\n    await pushRhDecision(link.rows[0]?.account_email ?? null, 'absence');",
  "    const absenceType = result.rows[0].status === 'approved' ? 'absence_approved' : 'absence_rejected';\n    await queueRhNotification(client, result.rows[0].collaboratorId, absenceType, id, result.rows[0].version);\n    const link = await client.query('SELECT account_email FROM redaction_rh.account_links WHERE collaborator_id=$1', [result.rows[0].collaboratorId]);\n    await client.query('COMMIT');\n    await pushRhDecision(link.rows[0]?.account_email ?? null, absenceType);",
);

// 3) Prestation : type selon la décision.
db = db.replace(
  "    await queueRhNotification(client, collaboratorId, 'prestation', submissionId, version + 1);",
  "    const submissionType = decision === 'approve' ? 'prestation_approved' : 'prestation_rejected';\n    await queueRhNotification(client, collaboratorId, submissionType, submissionId, version + 1);",
);

// 4) Document partagé : notification de disponibilité.
db = db.replace(
  "    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,document_id) VALUES ($1,$2,$3,$4)', [actor, 'document_create', input.collaboratorId, id]);\n    await client.query('COMMIT'); return result.rows[0];",
  "    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,document_id) VALUES ($1,$2,$3,$4)', [actor, 'document_create', input.collaboratorId, id]);\n    if (input.share) await queueRhNotification(client, input.collaboratorId, 'document_available', id, 1);\n    await client.query('COMMIT'); return result.rows[0];",
);

// 5) Contestation créée : confirmation collaborateur.
db = db.replace(
  "    await queueManagementEvent(client, 'contestation', result.rows[0].id);\n    await client.query('COMMIT'); return result.rows[0];",
  "    await queueManagementEvent(client, 'contestation', result.rows[0].id);\n    await queueRhNotification(client, id, 'dispute_created', result.rows[0].id, 1);\n    await client.query('COMMIT'); return result.rows[0];",
);
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/database.ts', db, 'utf8');
console.log('DATABASE', db.includes('absence_approved') && db.includes('dispute_created') && db.includes('document_available') ? 'OK' : 'MISS');

// 6) Correction de pointage demandée.
let corrections = fs.readFileSync('apps/redaction/src/lib/redaction/rh/attendance-corrections-db.ts', 'utf8');
corrections = corrections.replace("import { db } from './database';", "import { db, queueRhNotification } from './database';");
corrections = corrections.replace(
  "    await client.query(`INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,'attendance_correction_request',$2)`, [principal.email, person]);\n    await client.query('COMMIT');",
  "    await client.query(`INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,'attendance_correction_request',$2)`, [principal.email, person]);\n    await queueRhNotification(client, person, 'attendance_correction_requested', result.rows[0].id, 1);\n    await client.query('COMMIT');",
);
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/attendance-corrections-db.ts', corrections, 'utf8');
console.log('CORRECTIONS', corrections.includes('attendance_correction_requested') ? 'OK' : 'MISS');
