import fs from 'node:fs';

// --- submissions.ts : source + validation admin ---
let s = fs.readFileSync('apps/redaction/src/lib/redaction/rh/submissions.ts', 'utf8');
s = s.replace(
  "export interface Submission { id: string; date: string; description: string; status: SubmissionStatus; decisionNote: string; version: number }",
  "export interface Submission { id: string; date: string; description: string; status: SubmissionStatus; decisionNote: string; version: number; source?: 'employee' | 'admin'; createdByEmail?: string | null }\nexport interface AdminSubmissionInput { collaboratorId: string; date: string; description: string }",
);
if (!s.includes('validateAdminSubmission')) {
  s += `
export function validateAdminSubmission(value: unknown, today: string): AdminSubmissionInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.collaboratorId !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v.collaboratorId)) return null;
  if (!isValidDate(today) || !isValidDate(v.date) || v.date > today || typeof v.description !== 'string') return null;
  const description = v.description.trim();
  if (!description || description.length > 500 || /[\\u0000-\\u001f\\u007f]/.test(description)) return null;
  return { collaboratorId: v.collaboratorId, date: v.date, description };
}
`;
}
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/submissions.ts', s, 'utf8');
console.log('SUBMISSIONS', s.includes('validateAdminSubmission') ? 'OK' : 'MISS');

// --- database.ts : colonnes + création admin ---
let d = fs.readFileSync('apps/redaction/src/lib/redaction/rh/database.ts', 'utf8');
d = d.replace(
  "const submissionColumns = `id, to_char(activity_date, 'YYYY-MM-DD') AS date, description, status, decision_note AS \"decisionNote\", version`;",
  "const submissionColumns = `id, to_char(activity_date, 'YYYY-MM-DD') AS date, description, status, decision_note AS \"decisionNote\", version, source, created_by_email AS \"createdByEmail\"`;",
);
d = d.replace(
  "  const result = await db().query(`SELECT s.id, to_char(s.activity_date, 'YYYY-MM-DD') AS date, s.description, s.status, s.decision_note AS \"decisionNote\", s.version\n",
  "  const result = await db().query(`SELECT s.id, to_char(s.activity_date, 'YYYY-MM-DD') AS date, s.description, s.status, s.decision_note AS \"decisionNote\", s.version, s.source, s.created_by_email AS \"createdByEmail\"\n",
);
if (!d.includes('export async function createAdminSubmission')) {
  d = d.replace(
    "export async function cancelMySubmission(",
    `export async function createAdminSubmission(actor: string, input: import('./submissions').AdminSubmissionInput): Promise<import('./submissions').Submission | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [input.collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return null; }
    const existing = await client.query("SELECT 1 FROM redaction_rh.activity_submissions WHERE collaborator_id=$1 AND activity_date=$2 AND status<>'cancelled'", [input.collaboratorId, input.date]);
    if (existing.rowCount) { await client.query('ROLLBACK'); return null; }
    const created = await client.query(
      "INSERT INTO redaction_rh.activity_submissions (id, collaborator_id, activity_date, description, status, decision_note, source, created_by_email) VALUES ($1,$2,$3,$4,'approved',$5,'admin',$6) RETURNING " + submissionColumns,
      [randomUUID(), input.collaboratorId, input.date, input.description, 'Saisie par l’administration', actor],
    );
    await client.query("INSERT INTO redaction_rh.daily_activities (id,collaborator_id,activity_date,status,description) VALUES ($1,$2,$3,'effectuee',$4) ON CONFLICT (collaborator_id,activity_date) DO NOTHING", [randomUUID(), input.collaboratorId, input.date, input.description]);
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,submission_id) VALUES ($1,$2,$3,$4)', [actor, 'submission_admin_create', input.collaboratorId, created.rows[0].id]);
    await queueRhNotification(client, input.collaboratorId, 'prestation', created.rows[0].id, 1);
    await client.query('COMMIT');
    return created.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function cancelMySubmission(`,
  );
}
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/database.ts', d, 'utf8');
console.log('DATABASE', d.includes('createAdminSubmission') && d.includes('createdByEmail') ? 'OK' : 'MISS');
