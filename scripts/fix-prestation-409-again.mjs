import fs from 'node:fs';
// DB idempotence
let dbf = 'apps/redaction/src/lib/redaction/rh/database.ts';
let dtext = fs.readFileSync(dbf, 'utf8');
let deol = dtext.includes('\r\n') ? '\r\n' : '\n';
let dlines = dtext.split(/\r?\n/);
const di = dlines.findIndex(l => l.includes("FROM redaction_rh.daily_activities WHERE collaborator_id=$1 AND activity_date=$2"));
if (di > 0 && !dtext.includes('pendingForDay')) {
  dlines.splice(di - 1, 0,
    "      const replay = await client.query(`SELECT ${submissionColumns} FROM redaction_rh.activity_submissions WHERE id=$1 AND collaborator_id=$2`, [offline.id, id]);",
    "      if (replay.rowCount) { await client.query('COMMIT'); return replay.rows[0]; }",
    "      const pendingForDay = await client.query(`SELECT ${submissionColumns} FROM redaction_rh.activity_submissions WHERE collaborator_id=$1 AND activity_date=$2 AND status='pending' ORDER BY created_at DESC LIMIT 1`, [id, input.date]);",
    "      if (pendingForDay.rowCount) { await client.query('COMMIT'); return pendingForDay.rows[0]; }",
  );
  fs.writeFileSync(dbf, dlines.join(deol), 'utf8');
}
console.log(fs.readFileSync(dbf, 'utf8').includes('pendingForDay') ? 'DB_OK' : 'DB_MISS');

// Sync 409
let sf = 'apps/redaction/src/components/redaction/rh/offline-sync.tsx';
let stext = fs.readFileSync(sf, 'utf8');
let seol = stext.includes('\r\n') ? '\r\n' : '\n';
let slines = stext.split(/\r?\n/);
const si = slines.findIndex(l => l.trim() === 'if (!response.ok) {');
if (si > 0 && !stext.includes('response.status === 409')) {
  slines.splice(si, 0,
    "          if (response.status === 409) {",
    "            await remove(op.id);",
    "            notifyQueue();",
    "            if (live) {",
    "              setCount((n) => Math.max(0, n - 1));",
    "              setError(`${op.kind === 'prestation' ? 'Prestation' : op.kind === 'absence' ? 'Absence' : 'Pointage'} déjà enregistré côté serveur : élément retiré de la file.`);",
    "            }",
    "            continue;",
    "          }",
  );
  fs.writeFileSync(sf, slines.join(seol), 'utf8');
}
console.log(fs.readFileSync(sf, 'utf8').includes('response.status === 409') ? 'SYNC_OK' : 'SYNC_MISS');
