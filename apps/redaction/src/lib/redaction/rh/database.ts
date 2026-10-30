import 'server-only';
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import type { Collaborator, CollaboratorInput } from './collaborator';
import { nextAbsenceStatus, type AbsenceStatus } from './absences';
import { mayReviewWithdrawal } from './withdrawals';
import { availableAfterAdjustment } from './adjustments';
import { maskAccount, providerLabel, type PayoutMethod, type PayoutMethodInput } from './payouts';
import type { Attendance } from './attendance';

let pool: Pool | undefined;
export function db(): Pool {
  const connectionString = process.env.REDACTION_RH_DATABASE_URL;
  if (!connectionString) throw new Error('RH database not configured');
  return (pool ??= new Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000 }));
}
/** Un événement et sa notification sont enregistrés ensemble, sans données sensibles. */
async function queueRhNotification(client: PoolClient, collaboratorId: string, type: import('./notifications').RhNotificationType, sourceId: string, sourceVersion: number): Promise<void> {
  if (process.env.REDACTION_RH_NOTIFICATIONS_ENABLED !== 'true') return;
  await client.query(`INSERT INTO redaction_rh.notifications (id,collaborator_id,account_id,account_email,event_type,source_id,source_version)
    SELECT $1,l.collaborator_id,l.account_id,l.account_email,$3,$4,$5 FROM redaction_rh.account_links l
    WHERE l.collaborator_id=$2 ON CONFLICT (collaborator_id,event_type,source_id,source_version) DO NOTHING`, [randomUUID(), collaboratorId, type, sourceId, sourceVersion]);
}
/** Une alerte générique est créée dans la même transaction que la demande. */
async function queueManagementEvent(client: PoolClient, type: import('./management-notifications').ManagementEventType, sourceId: string): Promise<void> {
  if (process.env.REDACTION_RH_MANAGEMENT_NOTIFICATIONS_ENABLED !== 'true') return;
  await client.query('INSERT INTO redaction_rh.management_events (id,event_type,source_id) VALUES ($1,$2,$3) ON CONFLICT (event_type,source_id) DO NOTHING', [randomUUID(),type,sourceId]);
}
/**
 * Push facultatif après commit d’une décision RH : jamais de montant ni de motif.
 * Le push est subordonné au même drapeau que la notification in-app ; toute panne
 * Strapi/FCM est avalée pour ne pas remettre en cause la décision déjà validée.
 */
async function pushRhDecision(email: string | null | undefined, type: import('./notifications').RhNotificationType): Promise<void> {
  if (!email || process.env.REDACTION_RH_NOTIFICATIONS_ENABLED !== 'true') return;
  try {
    const [{ rhNotificationPush }, { notifyCollaboratorByEmail }] = await Promise.all([
      import('./notifications'),
      import('../web-push'),
    ]);
    const { sent, failed } = await notifyCollaboratorByEmail(email, rhNotificationPush(type));
    if (failed > 0) console.warn(`[rh] push ${type}: ${failed} échec(s)`);
    if (sent === 0 && failed === 0) console.warn(`[rh] push ${type}: aucun abonnement FCM actif`);
  } catch (error) {
    console.warn(`[rh] push ${type}: ${error instanceof Error ? error.message : 'erreur inconnue'}`);
  }
}
export async function listManagementEvents(actor: {id:number;email:string}, types: readonly import('./management-notifications').ManagementEventType[]): Promise<import('./management-notifications').ManagementEvent[]> {
  if (!types.length) return [];
  const result = await db().query(`SELECT e.id,e.event_type AS type,e.created_at AS "createdAt",r.read_at AS "readAt" FROM redaction_rh.management_events e LEFT JOIN redaction_rh.management_event_reads r ON r.event_id=e.id AND r.actor_id=$1 AND r.actor_email=$2 WHERE e.event_type=ANY($3::varchar[]) ORDER BY e.created_at DESC,e.id DESC LIMIT 30`,[actor.id,actor.email.toLowerCase(),types]);
  return result.rows;
}
export async function markManagementEventRead(actor: {id:number;email:string}, id:string, types: readonly import('./management-notifications').ManagementEventType[]): Promise<boolean> {
  if (!types.length) return false;
  const result = await db().query(`INSERT INTO redaction_rh.management_event_reads (event_id,actor_id,actor_email) SELECT id,$2,$3 FROM redaction_rh.management_events WHERE id=$1 AND event_type=ANY($4::varchar[]) ON CONFLICT (event_id,actor_id,actor_email) DO UPDATE SET read_at=redaction_rh.management_event_reads.read_at RETURNING event_id`,[id,actor.id,actor.email.toLowerCase(),types]);
  return !!result.rowCount;
}
const columns = `id, first_name AS "firstName", last_name AS "lastName", job_title AS "jobTitle", team,
  contract_status AS "contractStatus", to_char(start_date, 'YYYY-MM-DD') AS "startDate", archived, version`;

export async function listCollaborators(): Promise<Collaborator[]> {
  const result = await db().query(`SELECT ${columns} FROM redaction_rh.collaborators ORDER BY archived, last_name, first_name, id LIMIT 500`);
  return result.rows;
}

/** L'écriture et son événement d'audit sont validés ensemble. */
export async function saveCollaborator(input: CollaboratorInput, actor: string, id?: string, version?: number): Promise<Collaborator | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const values = [input.firstName, input.lastName, input.jobTitle, input.team, input.contractStatus, input.startDate];
    const result = id
      ? await client.query(`UPDATE redaction_rh.collaborators SET first_name=$1, last_name=$2, job_title=$3, team=$4, contract_status=$5, start_date=$6, version=version+1, updated_at=now() WHERE id=$7 AND version=$8 AND NOT archived RETURNING ${columns}`, [...values, id, version])
      : await client.query(`INSERT INTO redaction_rh.collaborators (first_name,last_name,job_title,team,contract_status,start_date,id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${columns}`, [...values, randomUUID()]);
    if (!result.rows[0]) { await client.query('ROLLBACK'); return null; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,$2,$3)', [actor, id ? 'update' : 'create', result.rows[0].id]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function archiveCollaborator(id: string, version: number, actor: string): Promise<Collaborator | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`UPDATE redaction_rh.collaborators SET archived=true, version=version+1, updated_at=now() WHERE id=$1 AND version=$2 AND NOT archived RETURNING ${columns}`, [id, version]);
    if (!result.rows[0]) { await client.query('ROLLBACK'); return null; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,$2,$3)', [actor, 'archive', id]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

const activityColumns = `id, collaborator_id AS "collaboratorId", to_char(activity_date, 'YYYY-MM-DD') AS date, status, description, version`;

export async function listActivities(collaboratorId: string, month: string): Promise<import('./activities').Activity[]> {
  const result = await db().query(`SELECT ${activityColumns} FROM redaction_rh.daily_activities
    WHERE collaborator_id = $1 AND to_char(activity_date, 'YYYY-MM') = $2 ORDER BY activity_date`, [collaboratorId, month]);
  return result.rows;
}

/** Un seul relevé journalier. Verrouille le dossier pour sérialiser l'archivage. */
export async function saveActivity(input: import('./activities').ActivityInput, actor: string, id?: string, version?: number): Promise<import('./activities').Activity | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const collaborator = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [input.collaboratorId]);
    if (!collaborator.rowCount) { await client.query('ROLLBACK'); return null; }
    const values = [input.collaboratorId, input.date, input.status, input.description];
    const result = id
      ? await client.query(`UPDATE redaction_rh.daily_activities SET status=$3, description=$4, version=version+1, updated_at=now()
          WHERE collaborator_id=$1 AND activity_date=$2 AND id=$5 AND version=$6 RETURNING ${activityColumns}`, [...values, id, version])
      : await client.query(`INSERT INTO redaction_rh.daily_activities (collaborator_id,activity_date,status,description,id)
          VALUES ($1,$2,$3,$4,$5) ON CONFLICT (collaborator_id,activity_date) DO NOTHING RETURNING ${activityColumns}`, [...values, randomUUID()]);
    if (!result.rows[0]) { await client.query('ROLLBACK'); return null; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,activity_id) VALUES ($1,$2,$3,$4)', [actor, id ? 'activity_update' : 'activity_create', input.collaboratorId, result.rows[0].id]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

const absenceColumns = `id, collaborator_id AS "collaboratorId", to_char(start_date, 'YYYY-MM-DD') AS "startDate", to_char(end_date, 'YYYY-MM-DD') AS "endDate", category, status, decision_note AS "decisionNote", version`;

export async function listAbsences(collaboratorId: string, month?: string): Promise<import('./absences').Absence[]> {
  const result = month
    ? await db().query(`SELECT ${absenceColumns} FROM redaction_rh.absence_requests WHERE collaborator_id=$1 AND status='approved' AND start_date < ($2::date + interval '1 month') AND end_date >= $2::date ORDER BY start_date DESC, id`, [collaboratorId, `${month}-01`])
    : await db().query(`SELECT ${absenceColumns} FROM redaction_rh.absence_requests WHERE collaborator_id=$1 ORDER BY start_date DESC, id LIMIT 500`, [collaboratorId]);
  return result.rows;
}

/** Sérialise les créations pour un collaborateur avant la détection de chevauchement. */
export async function createAbsence(input: import('./absences').AbsenceInput, actor: string, principal?: import('./principal').RhPrincipal): Promise<import('./absences').Absence | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [input.collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return null; }
    if (principal) {
      const linked = await client.query('SELECT 1 FROM redaction_rh.account_links WHERE collaborator_id=$1 AND account_id=$2 AND account_email=$3', [input.collaboratorId, principal.id, principal.email]);
      if (!linked.rowCount) { await client.query('ROLLBACK'); return null; }
    }
    const overlap = await client.query(`SELECT 1 FROM redaction_rh.absence_requests WHERE collaborator_id=$1 AND status IN ('pending','approved') AND start_date <= $3 AND end_date >= $2 LIMIT 1`, [input.collaboratorId, input.startDate, input.endDate]);
    if (overlap.rowCount) { await client.query('ROLLBACK'); return null; }
    const result = await client.query(`INSERT INTO redaction_rh.absence_requests (id,collaborator_id,start_date,end_date,category) VALUES ($1,$2,$3,$4,$5) RETURNING ${absenceColumns}`, [randomUUID(), input.collaboratorId, input.startDate, input.endDate, input.category]);
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,absence_id) VALUES ($1,$2,$3,$4)', [actor, 'absence_create', input.collaboratorId, result.rows[0].id]);
    if (principal) await queueManagementEvent(client, 'absence', result.rows[0].id);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function decideAbsence(id: string, version: number, decision: import('./absences').AbsenceDecision, note: string, actor: string): Promise<import('./absences').Absence | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    // Le verrou du collaborateur est commun à la création et à l'archivage.
    const selected = await client.query('SELECT collaborator_id, status FROM redaction_rh.absence_requests WHERE id=$1', [id]);
    if (!selected.rowCount) { await client.query('ROLLBACK'); return null; }
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [selected.rows[0].collaborator_id]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return null; }
    const current = selected.rows[0].status as AbsenceStatus;
    const status = nextAbsenceStatus(current, decision);
    if (!status) { await client.query('ROLLBACK'); return null; }
    const result = await client.query(`UPDATE redaction_rh.absence_requests SET status=$1, decision_note=$2, version=version+1, updated_at=now() WHERE id=$3 AND version=$4 AND status=$5 RETURNING ${absenceColumns}`, [status, note, id, version, current]);
    if (!result.rows[0]) { await client.query('ROLLBACK'); return null; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,absence_id) VALUES ($1,$2,$3,$4)', [actor, `absence_${decision}`, result.rows[0].collaboratorId, id]);
    await queueRhNotification(client, result.rows[0].collaboratorId, 'absence', id, result.rows[0].version);
    const link = await client.query('SELECT account_email FROM redaction_rh.account_links WHERE collaborator_id=$1', [result.rows[0].collaboratorId]);
    await client.query('COMMIT');
    await pushRhDecision(link.rows[0]?.account_email ?? null, 'absence');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function getAccountLink(collaboratorId: string): Promise<{ id: number; email: string } | null> {
  const result = await db().query('SELECT account_id AS id, account_email AS email FROM redaction_rh.account_links WHERE collaborator_id=$1', [collaboratorId]);
  return result.rows[0] ?? null;
}

/** Le verrou du collaborateur protège le lien contre l'archivage concurrent. */
export async function changeAccountLink(collaboratorId: string, version: number, principal: import('./principal').RhPrincipal | null, actor: string): Promise<'ok' | 'conflict'> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND version=$2 AND NOT archived FOR UPDATE', [collaboratorId, version]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return 'conflict'; }
    const existing = await client.query('SELECT account_id FROM redaction_rh.account_links WHERE collaborator_id=$1', [collaboratorId]);
    if ((principal && existing.rowCount) || (!principal && !existing.rowCount)) { await client.query('ROLLBACK'); return 'conflict'; }
    if (principal) await client.query('INSERT INTO redaction_rh.account_links (collaborator_id,account_id,account_email) VALUES ($1,$2,$3)', [collaboratorId, principal.id, principal.email]);
    else await client.query('DELETE FROM redaction_rh.account_links WHERE collaborator_id=$1', [collaboratorId]);
    await client.query('UPDATE redaction_rh.collaborators SET version=version+1, updated_at=now() WHERE id=$1', [collaboratorId]);
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,linked_account_id) VALUES ($1,$2,$3,$4)', [actor, principal ? 'account_link' : 'account_unlink', collaboratorId, principal?.id ?? existing.rows[0].account_id]);
    await client.query('COMMIT');
    return 'ok';
  } catch (error) {
    await client.query('ROLLBACK');
    if ((error as { code?: string }).code === '23505') return 'conflict';
    throw error;
  } finally { client.release(); }
}

export async function getMyCollaborator(principal: import('./principal').RhPrincipal): Promise<{ id: string; firstName: string; lastName: string } | null> {
  const result = await db().query(`SELECT c.id,c.first_name AS "firstName",c.last_name AS "lastName" FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived`, [principal.id, principal.email]);
  return result.rows[0] ?? null;
}

/** Une seule requête réévalue l'appartenance au dossier pour toute lecture. */
export async function listMyAbsences(principal: import('./principal').RhPrincipal): Promise<import('./absences').Absence[]> {
  const result = await db().query(`SELECT a.id, a.collaborator_id AS "collaboratorId", to_char(a.start_date, 'YYYY-MM-DD') AS "startDate", to_char(a.end_date, 'YYYY-MM-DD') AS "endDate", a.category, a.status, a.decision_note AS "decisionNote", a.version FROM redaction_rh.absence_requests a JOIN redaction_rh.collaborators c ON c.id=a.collaborator_id JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived ORDER BY a.start_date DESC, a.id LIMIT 500`, [principal.id, principal.email]);
  return result.rows;
}

/** Annulation personnelle : uniquement ses demandes en attente, après vérification sous verrou. */
export async function cancelMyAbsence(principal: import('./principal').RhPrincipal, id: string, version: number): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query(`SELECT c.id FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived FOR UPDATE OF c`, [principal.id, principal.email]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    // Les changements de liaison verrouillent également le dossier ; vérifier après acquisition du verrou.
    const linked = await client.query('SELECT 1 FROM redaction_rh.account_links WHERE collaborator_id=$1 AND account_id=$2 AND account_email=$3', [person.rows[0].id, principal.id, principal.email]);
    if (!linked.rowCount) { await client.query('ROLLBACK'); return false; }
    const result = await client.query(`UPDATE redaction_rh.absence_requests SET status='cancelled', decision_note='', version=version+1, updated_at=now() WHERE id=$1 AND collaborator_id=$2 AND version=$3 AND status='pending' RETURNING id`, [id, person.rows[0].id, version]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,absence_id) VALUES ($1,$2,$3,$4)', [principal.email, 'absence_self_cancel', person.rows[0].id, id]);
    await client.query('COMMIT');
    return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

const submissionColumns = `id, to_char(activity_date, 'YYYY-MM-DD') AS date, description, status, decision_note AS "decisionNote", version`;

export async function listSubmissions(collaboratorId: string): Promise<import('./submissions').Submission[]> {
  const result = await db().query(`SELECT ${submissionColumns} FROM redaction_rh.activity_submissions WHERE collaborator_id=$1 ORDER BY created_at DESC, id LIMIT 500`, [collaboratorId]);
  return result.rows;
}
export async function listMySubmissions(principal: import('./principal').RhPrincipal): Promise<import('./submissions').Submission[]> {
  const result = await db().query(`SELECT s.id, to_char(s.activity_date, 'YYYY-MM-DD') AS date, s.description, s.status, s.decision_note AS "decisionNote", s.version FROM redaction_rh.activity_submissions s JOIN redaction_rh.collaborators c ON c.id=s.collaborator_id JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived ORDER BY s.created_at DESC, s.id LIMIT 500`, [principal.id, principal.email]);
  return result.rows;
}

export async function createMySubmission(principal: import('./principal').RhPrincipal, input: import('./submissions').SubmissionInput): Promise<import('./submissions').Submission | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query(`SELECT c.id FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived FOR UPDATE OF c`, [principal.id, principal.email]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return null; }
    const id = person.rows[0].id;
    const linked = await client.query('SELECT 1 FROM redaction_rh.account_links WHERE collaborator_id=$1 AND account_id=$2 AND account_email=$3', [id, principal.id, principal.email]);
    if (!linked.rowCount) { await client.query('ROLLBACK'); return null; }
    const existing = await client.query('SELECT 1 FROM redaction_rh.daily_activities WHERE collaborator_id=$1 AND activity_date=$2', [id, input.date]);
    if (existing.rowCount) { await client.query('ROLLBACK'); return null; }
    const created = await client.query(`INSERT INTO redaction_rh.activity_submissions (id, collaborator_id, activity_date, description) VALUES ($1,$2,$3,$4) ON CONFLICT (collaborator_id, activity_date) WHERE status='pending' DO NOTHING RETURNING ${submissionColumns}`, [randomUUID(), id, input.date, input.description]);
    if (!created.rowCount) { await client.query('ROLLBACK'); return null; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,submission_id) VALUES ($1,$2,$3,$4)', [principal.email, 'submission_create', id, created.rows[0].id]);
    await queueManagementEvent(client, 'prestation', created.rows[0].id);
    await client.query('COMMIT');
    return created.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function cancelMySubmission(principal: import('./principal').RhPrincipal, submissionId: string, version: number): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query(`SELECT c.id FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived FOR UPDATE OF c`, [principal.id, principal.email]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    const id = person.rows[0].id;
    const linked = await client.query('SELECT 1 FROM redaction_rh.account_links WHERE collaborator_id=$1 AND account_id=$2 AND account_email=$3', [id, principal.id, principal.email]);
    if (!linked.rowCount) { await client.query('ROLLBACK'); return false; }
    const result = await client.query(`UPDATE redaction_rh.activity_submissions SET status='cancelled',version=version+1,updated_at=now() WHERE id=$1 AND collaborator_id=$2 AND version=$3 AND status='pending' RETURNING id`, [submissionId, id, version]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,submission_id) VALUES ($1,$2,$3,$4)', [principal.email, 'submission_cancel', id, submissionId]);
    await client.query('COMMIT');
    return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function decideSubmission(submissionId: string, version: number, decision: 'approve' | 'reject', note: string, actor: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const candidate = await client.query('SELECT collaborator_id FROM redaction_rh.activity_submissions WHERE id=$1', [submissionId]);
    if (!candidate.rowCount) { await client.query('ROLLBACK'); return false; }
    const collaboratorId = candidate.rows[0].collaborator_id;
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    const submission = await client.query(`SELECT id,activity_date,description FROM redaction_rh.activity_submissions WHERE id=$1 AND collaborator_id=$2 AND version=$3 AND status='pending' FOR UPDATE`, [submissionId, collaboratorId, version]);
    if (!submission.rowCount) { await client.query('ROLLBACK'); return false; }
    let activityId: string | null = null;
    if (decision === 'approve') {
      const created = await client.query(`INSERT INTO redaction_rh.daily_activities (id,collaborator_id,activity_date,status,description) VALUES ($1,$2,$3,'effectuee',$4) ON CONFLICT (collaborator_id,activity_date) DO NOTHING RETURNING id`, [randomUUID(), collaboratorId, submission.rows[0].activity_date, submission.rows[0].description]);
      // Ne jamais écraser un relevé saisi par l'admin.
      if (!created.rowCount) { await client.query('ROLLBACK'); return false; }
      activityId = created.rows[0].id;
    }
    await client.query(`UPDATE redaction_rh.activity_submissions SET status=$1,decision_note=$2,version=version+1,updated_at=now() WHERE id=$3`, [decision === 'approve' ? 'approved' : 'rejected', note, submissionId]);
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,submission_id,activity_id) VALUES ($1,$2,$3,$4,$5)', [actor, `submission_${decision}`, collaboratorId, submissionId, activityId]);
    await queueRhNotification(client, collaboratorId, 'prestation', submissionId, version + 1);
    await client.query('COMMIT');
    return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

const remunerationColumns = `id, to_char(period, 'YYYY-MM') AS month, currency, amount_minor::text AS "amountMinor", status, version, validated_at AS "validatedAt"`;

export async function listRemunerations(collaboratorId: string): Promise<import('./remunerations').Remuneration[]> {
  return (await db().query(`SELECT ${remunerationColumns} FROM redaction_rh.remunerations WHERE collaborator_id=$1 ORDER BY period DESC, created_at DESC, id LIMIT 500`, [collaboratorId])).rows;
}
export async function listMyRemunerations(principal: import('./principal').RhPrincipal): Promise<import('./remunerations').Remuneration[]> {
  return (await db().query(`SELECT r.id, to_char(r.period, 'YYYY-MM') AS month, r.currency, r.amount_minor::text AS "amountMinor", r.status, r.version, r.validated_at AS "validatedAt" FROM redaction_rh.remunerations r JOIN redaction_rh.collaborators c ON c.id=r.collaborator_id JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived AND r.status='validated' ORDER BY r.period DESC, r.created_at DESC, r.id LIMIT 500`, [principal.id, principal.email])).rows;
}
/** Une coupure existante reste applicable même si les retraits sont désactivés.
 * Avant l'installation de cette migration, les rémunérations seules restent utilisables. */
async function isCoveredByOpening(client: PoolClient, collaboratorId: string, currency: string, period: string | Date): Promise<boolean> {
  const exists = await client.query("SELECT to_regclass('redaction_rh.opening_balances') IS NOT NULL AS present");
  if (!exists.rows[0].present) {
    if (process.env.REDACTION_RH_WITHDRAWALS_ENABLED === 'true') throw new Error('RH opening balances migration missing');
    return false;
  }
  const opening = await client.query('SELECT 1 FROM redaction_rh.opening_balances WHERE collaborator_id=$1 AND currency=$2 AND through_month >= $3::date', [collaboratorId, currency, period]);
  return !!opening.rowCount;
}
export async function createRemuneration(input: import('./remunerations').RemunerationInput, actor: string): Promise<import('./remunerations').Remuneration | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [input.collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return null; }
    if (await isCoveredByOpening(client, input.collaboratorId, input.currency, `${input.month}-01`)) { await client.query('ROLLBACK'); return null; }
    const result = await client.query(`INSERT INTO redaction_rh.remunerations (id,collaborator_id,period,currency,amount_minor) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (collaborator_id,period,currency) WHERE status IN ('draft','validated') DO NOTHING RETURNING ${remunerationColumns}`, [randomUUID(), input.collaboratorId, `${input.month}-01`, input.currency, input.amountMinor]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return null; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,remuneration_id) VALUES ($1,$2,$3,$4)', [actor, 'remuneration_create', input.collaboratorId, result.rows[0].id]);
    await client.query('COMMIT'); return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function decideRemuneration(id: string, version: number, decision: 'validate' | 'cancel', actor: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const record = await client.query('SELECT collaborator_id,currency,period FROM redaction_rh.remunerations WHERE id=$1', [id]);
    if (!record.rowCount) { await client.query('ROLLBACK'); return false; }
    const collaboratorId = record.rows[0].collaborator_id;
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    if (decision === 'validate' && await isCoveredByOpening(client, collaboratorId, record.rows[0].currency, record.rows[0].period)) { await client.query('ROLLBACK'); return false; }
    const status = decision === 'validate' ? 'validated' : 'cancelled';
    const result = await client.query(`UPDATE redaction_rh.remunerations SET status=$1::varchar,validated_at=CASE WHEN $1::varchar='validated' THEN now() ELSE NULL END,version=version+1,updated_at=now() WHERE id=$2 AND version=$3 AND status='draft' RETURNING id`, [status, id, version]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,remuneration_id) VALUES ($1,$2,$3,$4)', [actor, `remuneration_${decision}`, collaboratorId, id]);
    if (decision === 'validate') await queueRhNotification(client, collaboratorId, 'remuneration', id, version + 1);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

const withdrawalCols = `id,currency,amount_minor::text AS "amountMinor",method,status,decision_note AS "decisionNote",to_char(payment_date,'YYYY-MM-DD') AS "paymentDate",payment_reference AS "paymentReference",payout_method_id AS "payoutMethodId",payout_label AS "payoutLabel",version`;
const balanceSql = `WITH currencies(currency) AS (VALUES ('CDF'),('USD'))
SELECT currencies.currency, o.amount_minor::text AS opening, to_char(o.through_month,'YYYY-MM') AS "throughMonth",
  COALESCE((SELECT SUM(r.amount_minor) FROM redaction_rh.remunerations r WHERE r.collaborator_id=$1 AND r.currency=currencies.currency AND r.status='validated' AND r.period>o.through_month),0)::text AS validated,
  COALESCE((SELECT SUM(a.amount_minor) FROM redaction_rh.balance_adjustments a WHERE a.collaborator_id=$1 AND a.currency=currencies.currency AND a.status='validated' AND a.direction='credit'),0)::text AS "adjustmentCredits",
  COALESCE((SELECT SUM(a.amount_minor) FROM redaction_rh.balance_adjustments a WHERE a.collaborator_id=$1 AND a.currency=currencies.currency AND a.status='validated' AND a.direction='debit'),0)::text AS "adjustmentDebits",
  COALESCE((SELECT SUM(w.amount_minor) FROM redaction_rh.withdrawals w WHERE w.collaborator_id=$1 AND w.currency=currencies.currency AND w.status IN ('pending','approved')),0)::text AS reserved,
  COALESCE((SELECT SUM(w.amount_minor) FROM redaction_rh.withdrawals w WHERE w.collaborator_id=$1 AND w.currency=currencies.currency AND w.status='paid'),0)::text AS paid
FROM currencies LEFT JOIN redaction_rh.opening_balances o ON o.collaborator_id=$1 AND o.currency=currencies.currency`;
function addAvailable(row: Omit<import('./withdrawals').Balance, 'available'>): import('./withdrawals').Balance {
  const available = availableAfterAdjustment(row);
  return { ...row, available: available === null ? null : available.toString() };
}

export async function myWithdrawalView(principal: import('./principal').RhPrincipal): Promise<{ balances: import('./withdrawals').Balance[]; withdrawals: import('./withdrawals').Withdrawal[] } | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const person = await client.query(`SELECT c.id FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived`, [principal.id, principal.email]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return null; }
    const [balances, withdrawals] = await Promise.all([
      client.query(balanceSql, [person.rows[0].id]),
      client.query(`SELECT ${withdrawalCols} FROM redaction_rh.withdrawals WHERE collaborator_id=$1 ORDER BY created_at DESC,id LIMIT 500`, [person.rows[0].id]),
    ]);
    await client.query('COMMIT');
    return { balances: balances.rows.map(addAvailable), withdrawals: withdrawals.rows };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function adminWithdrawalView(collaboratorId: string): Promise<{ balances: import('./withdrawals').Balance[]; withdrawals: import('./withdrawals').Withdrawal[] }> {
  const client = await db().connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const [balances, withdrawals] = await Promise.all([client.query(balanceSql, [collaboratorId]), client.query(`SELECT ${withdrawalCols} FROM redaction_rh.withdrawals WHERE collaborator_id=$1 ORDER BY created_at DESC,id LIMIT 500`, [collaboratorId])]);
    await client.query('COMMIT'); return { balances: balances.rows.map(addAvailable), withdrawals: withdrawals.rows };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function createMyWithdrawal(principal: import('./principal').RhPrincipal, input: import('./withdrawals').WithdrawalInput): Promise<import('./withdrawals').Withdrawal | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query(`SELECT c.id FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived FOR UPDATE OF c`, [principal.id, principal.email]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return null; }
    const collaboratorId = person.rows[0].id;
    const linked = await client.query('SELECT 1 FROM redaction_rh.account_links WHERE collaborator_id=$1 AND account_id=$2 AND account_email=$3', [collaboratorId, principal.id, principal.email]);
    if (!linked.rowCount) { await client.query('ROLLBACK'); return null; }
    let payoutMethodId: string | null = null;
    let payoutLabel: string | null = null;
    if (input.payoutMethodId) {
      const payout = await client.query('SELECT kind,provider,account_number,currency FROM redaction_rh.payout_methods WHERE id=$1 AND collaborator_id=$2 AND active', [input.payoutMethodId, collaboratorId]);
      if (!payout.rowCount || payout.rows[0].currency !== input.currency) { await client.query('ROLLBACK'); return null; }
      payoutMethodId = input.payoutMethodId;
      payoutLabel = `${providerLabel(payout.rows[0].kind, payout.rows[0].provider)} · ${maskAccount(payout.rows[0].account_number)}`;
    }
    const previous = await client.query(`SELECT ${withdrawalCols},collaborator_id FROM redaction_rh.withdrawals WHERE idempotency_key=$1`, [input.key]);
    if (previous.rowCount) {
      const row = previous.rows[0];
      if (row.collaborator_id !== collaboratorId || row.currency !== input.currency || row.amountMinor !== input.amountMinor || row.method !== input.method || row.payoutMethodId !== (input.payoutMethodId ?? null)) { await client.query('ROLLBACK'); return null; }
      delete row.collaborator_id;
      await client.query('COMMIT'); return row;
    }
    const balances = await client.query(balanceSql, [collaboratorId]);
    const balance = balances.rows.map(addAvailable).find((x) => x.currency === input.currency);
    if (!balance || balance.available === null || BigInt(balance.available) < BigInt(input.amountMinor)) { await client.query('ROLLBACK'); return null; }
    const result = await client.query(`INSERT INTO redaction_rh.withdrawals (id,collaborator_id,idempotency_key,requester_email,currency,amount_minor,method,payout_method_id,payout_label) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (idempotency_key) DO NOTHING RETURNING ${withdrawalCols}`, [randomUUID(), collaboratorId, input.key, principal.email, input.currency, input.amountMinor, input.method, payoutMethodId, payoutLabel]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return null; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,withdrawal_id) VALUES ($1,$2,$3,$4)', [principal.email, 'withdrawal_create', collaboratorId, result.rows[0].id]);
    await queueManagementEvent(client, 'retrait', result.rows[0].id);
    await client.query('COMMIT'); return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function cancelMyWithdrawal(principal: import('./principal').RhPrincipal, id: string, version: number): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query(`SELECT c.id FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived FOR UPDATE OF c`, [principal.id, principal.email]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    const collaboratorId = person.rows[0].id;
    const linked = await client.query('SELECT 1 FROM redaction_rh.account_links WHERE collaborator_id=$1 AND account_id=$2 AND account_email=$3', [collaboratorId, principal.id, principal.email]);
    if (!linked.rowCount) { await client.query('ROLLBACK'); return false; }
    const result = await client.query(`UPDATE redaction_rh.withdrawals SET status='cancelled',version=version+1,updated_at=now() WHERE id=$1 AND collaborator_id=$2 AND version=$3 AND status='pending' RETURNING id`, [id, collaboratorId, version]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,withdrawal_id) VALUES ($1,$2,$3,$4)', [principal.email, 'withdrawal_cancel', collaboratorId, id]);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function decideWithdrawal(id: string, version: number, decision: import('./withdrawals').WithdrawalDecision, actor: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const record = await client.query('SELECT collaborator_id,requester_email,method FROM redaction_rh.withdrawals WHERE id=$1', [id]);
    if (!record.rowCount) { await client.query('ROLLBACK'); return false; }
    const personId = record.rows[0].collaborator_id;
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [personId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    const link = await client.query('SELECT account_email FROM redaction_rh.account_links WHERE collaborator_id=$1', [personId]);
    // Sans lien actif on refuse aussi : impossible d'identifier le bénéficiaire actuel.
    if (!mayReviewWithdrawal(actor, record.rows[0].requester_email, link.rows[0]?.account_email ?? null)) { await client.query('ROLLBACK'); return false; }
    if (decision.action === 'pay' && ['mobile_money', 'virement'].includes(record.rows[0].method) && !decision.paymentReference) { await client.query('ROLLBACK'); return false; }
    const status = decision.action === 'approve' ? 'approved' : decision.action === 'reject' ? 'rejected' : 'paid';
    const allowed = decision.action === 'approve' ? ['pending'] : decision.action === 'reject' ? ['pending','approved'] : ['approved'];
    const result = await client.query(`UPDATE redaction_rh.withdrawals SET status=$1,decision_note=$2,payment_date=$3,payment_reference=$4,version=version+1,updated_at=now() WHERE id=$5 AND collaborator_id=$6 AND version=$7 AND status = ANY($8::varchar[]) RETURNING id`, [status, decision.note, decision.paymentDate, decision.paymentReference, id, personId, version, allowed]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,withdrawal_id) VALUES ($1,$2,$3,$4)', [actor, `withdrawal_${decision.action}`, personId, id]);
    await queueRhNotification(client, personId, 'retrait', id, version + 1);
    await client.query('COMMIT');
    await pushRhDecision(link.rows[0]?.account_email ?? null, 'retrait');
    return true;
  } catch (error) { await client.query('ROLLBACK'); if ((error as { code?: string }).code === '23505') return false; throw error; }
  finally { client.release(); }
}

export async function getRhRoles(principal: import('./principal').RhPrincipal): Promise<import('./permissions').RhRole[]> {
  const result = await db().query(`SELECT g.role FROM redaction_rh.role_grants g JOIN redaction_rh.collaborators c ON c.id=g.collaborator_id JOIN redaction_rh.account_links l ON l.collaborator_id=g.collaborator_id AND l.account_id=g.account_id AND l.account_email=g.account_email WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived`, [principal.id, principal.email]);
  return result.rows.map((row) => row.role);
}
export interface RhGrantRow { collaboratorId: string; firstName: string; lastName: string; accountId: number; email: string; role: import('./permissions').RhRole }
export async function listRhGrants(): Promise<RhGrantRow[]> {
  return (await db().query(`SELECT g.collaborator_id AS "collaboratorId",c.first_name AS "firstName",c.last_name AS "lastName",g.account_id AS "accountId",g.account_email AS email,g.role FROM redaction_rh.role_grants g JOIN redaction_rh.collaborators c ON c.id=g.collaborator_id WHERE NOT c.archived ORDER BY c.last_name,c.first_name,g.role LIMIT 500`)).rows;
}
export async function changeRhGrant(collaboratorId: string, role: import('./permissions').RhRole, grant: boolean, actor: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    const link = await client.query('SELECT account_id,account_email FROM redaction_rh.account_links WHERE collaborator_id=$1', [collaboratorId]);
    if (!link.rowCount) { await client.query('ROLLBACK'); return false; }
    const result = grant
      ? await client.query('INSERT INTO redaction_rh.role_grants (collaborator_id,account_id,account_email,role) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING role', [collaboratorId,link.rows[0].account_id,link.rows[0].account_email,role])
      : await client.query('DELETE FROM redaction_rh.role_grants WHERE collaborator_id=$1 AND role=$2 RETURNING role', [collaboratorId,role]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,linked_account_id,rh_role) VALUES ($1,$2,$3,$4,$5)', [actor, grant ? 'role_grant' : 'role_revoke', collaboratorId, link.rows[0].account_id, role]);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

/** Export limité et audit atomiques : échec de l'audit = aucun fichier. */
export async function exportRhReport(filter: import('./reports').ReportFilter, actor: string): Promise<{ headers: string[]; rows: unknown[][] } | null> {
  const { REPORT_LIMIT } = await import('./reports');
  const client = await db().connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    let headers: string[]; let query: string; let values: unknown[];
    if (filter.type === 'collaborateurs') {
      headers = ['Prénom', 'Nom', 'Fonction', 'Équipe', 'Statut de collaboration', 'Date d’arrivée', 'Dossier archivé'];
      query = `SELECT c.first_name,c.last_name,c.job_title,c.team,c.contract_status,to_char(c.start_date,'YYYY-MM-DD') AS start_date,CASE WHEN c.archived THEN 'Oui' ELSE 'Non' END AS archived FROM redaction_rh.collaborators c WHERE ($1::text IS NULL OR c.team=$1) ORDER BY c.last_name,c.first_name,c.id LIMIT $2`;
      values = [filter.team, REPORT_LIMIT + 1];
    } else if (filter.type === 'absences') {
      headers = ['Prénom', 'Nom', 'Équipe', 'Type', 'Début', 'Fin', 'Statut'];
      query = `SELECT c.first_name,c.last_name,c.team,a.category,to_char(a.start_date,'YYYY-MM-DD') AS start_date,to_char(a.end_date,'YYYY-MM-DD') AS end_date,CASE a.status WHEN 'pending' THEN 'En attente' WHEN 'approved' THEN 'Approuvée' WHEN 'rejected' THEN 'Refusée' WHEN 'cancelled' THEN 'Annulée' END AS status FROM redaction_rh.absence_requests a JOIN redaction_rh.collaborators c ON c.id=a.collaborator_id WHERE a.start_date <= $2::date AND a.end_date >= $1::date AND ($3::text IS NULL OR c.team=$3) ORDER BY a.start_date,c.last_name,c.first_name,a.id LIMIT $4`;
      values = [filter.start, filter.end, filter.team, REPORT_LIMIT + 1];
    } else {
      headers = ['Prénom', 'Nom', 'Équipe', 'Date', 'Statut'];
      query = `SELECT c.first_name,c.last_name,c.team,to_char(a.activity_date,'YYYY-MM-DD') AS activity_date,CASE a.status WHEN 'effectuee' THEN 'Prestation effectuée' WHEN 'absence_signalee' THEN 'Absence signalée' WHEN 'absence_justifiee' THEN 'Absence justifiée' END AS status FROM redaction_rh.daily_activities a JOIN redaction_rh.collaborators c ON c.id=a.collaborator_id WHERE a.activity_date BETWEEN $1::date AND $2::date AND ($3::text IS NULL OR c.team=$3) ORDER BY a.activity_date,c.last_name,c.first_name,a.id LIMIT $4`;
      values = [filter.start, filter.end, filter.team, REPORT_LIMIT + 1];
    }
    // rowMode array évite que l'ordre ou les alias des champs ne modifient les colonnes CSV.
    const result = await client.query({ text: query, values, rowMode: 'array' });
    if (result.rows.length > REPORT_LIMIT) { await client.query('ROLLBACK'); return null; }
    await client.query('INSERT INTO redaction_rh.report_audit (actor_email,report_type,row_count) VALUES ($1,$2,$3)', [actor, filter.type, result.rows.length]);
    await client.query('COMMIT'); return { headers, rows: result.rows as unknown[][] };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function listMyNotifications(principal: import('./principal').RhPrincipal): Promise<import('./notifications').RhNotification[]> {
  const result = await db().query(`SELECT n.id,n.event_type AS type,n.created_at AS "createdAt",n.read_at AS "readAt" FROM redaction_rh.notifications n JOIN redaction_rh.collaborators c ON c.id=n.collaborator_id JOIN redaction_rh.account_links l ON l.collaborator_id=n.collaborator_id AND l.account_id=n.account_id AND l.account_email=n.account_email WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived ORDER BY n.created_at DESC,n.id LIMIT 100`, [principal.id, principal.email]);
  return result.rows;
}
export async function markMyNotificationRead(principal: import('./principal').RhPrincipal, notificationId: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query(`SELECT c.id FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived FOR UPDATE OF c`, [principal.id, principal.email]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    const linked = await client.query('SELECT 1 FROM redaction_rh.account_links WHERE collaborator_id=$1 AND account_id=$2 AND account_email=$3', [person.rows[0].id, principal.id, principal.email]);
    if (!linked.rowCount) { await client.query('ROLLBACK'); return false; }
    const result = await client.query(`UPDATE redaction_rh.notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND collaborator_id=$2 AND account_id=$3 AND account_email=$4 RETURNING id`, [notificationId, person.rows[0].id, principal.id, principal.email]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

const documentCols = `id,title,category,file_type AS "fileType",octet_length(file_bytes) AS size,created_at AS "createdAt",version,(SELECT s.account_email FROM redaction_rh.document_shares s WHERE s.document_id=documents.id) AS "visibleTo"`;
export async function listDocuments(collaboratorId: string): Promise<import('./documents').DocumentMeta[]> {
  return (await db().query(`SELECT ${documentCols} FROM redaction_rh.documents WHERE collaborator_id=$1 AND NOT archived AND EXISTS (SELECT 1 FROM redaction_rh.collaborators c WHERE c.id=collaborator_id AND NOT c.archived) ORDER BY created_at DESC,id LIMIT 500`, [collaboratorId])).rows;
}
export async function listMyDocuments(principal: import('./principal').RhPrincipal): Promise<import('./documents').DocumentMeta[]> {
  return (await db().query(`SELECT d.id,d.title,d.category,d.file_type AS "fileType",octet_length(d.file_bytes) AS size,d.created_at AS "createdAt",d.version FROM redaction_rh.documents d JOIN redaction_rh.collaborators c ON c.id=d.collaborator_id JOIN redaction_rh.document_shares s ON s.document_id=d.id AND s.collaborator_id=c.id JOIN redaction_rh.account_links l ON l.collaborator_id=s.collaborator_id AND l.account_id=s.account_id AND l.account_email=s.account_email WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived AND NOT d.archived ORDER BY d.created_at DESC,d.id LIMIT 500`, [principal.id, principal.email])).rows;
}
export async function createDocument(input: { collaboratorId: string; title: string; category: import('./documents').DocumentCategory; fileType: import('./documents').DocumentFileType; bytes: Buffer; share: boolean }, actor: string): Promise<import('./documents').DocumentMeta | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [input.collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return null; }
    const link = input.share ? await client.query('SELECT account_id,account_email FROM redaction_rh.account_links WHERE collaborator_id=$1', [input.collaboratorId]) : null;
    if (input.share && !link?.rowCount) { await client.query('ROLLBACK'); return null; }
    const id = randomUUID();
    await client.query('INSERT INTO redaction_rh.documents (id,collaborator_id,title,category,file_type,file_bytes) VALUES ($1,$2,$3,$4,$5,$6)', [id, input.collaboratorId, input.title, input.category, input.fileType, input.bytes]);
    if (input.share) await client.query('INSERT INTO redaction_rh.document_shares (document_id,collaborator_id,account_id,account_email) VALUES ($1,$2,$3,$4)', [id, input.collaboratorId, link!.rows[0].account_id, link!.rows[0].account_email]);
    const result = await client.query(`SELECT ${documentCols} FROM redaction_rh.documents WHERE id=$1`, [id]);
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,document_id) VALUES ($1,$2,$3,$4)', [actor, 'document_create', input.collaboratorId, id]);
    await client.query('COMMIT'); return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function archiveDocument(id: string, version: number, actor: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT collaborator_id FROM redaction_rh.documents WHERE id=$1', [id]);
    if (!existing.rowCount) { await client.query('ROLLBACK'); return false; }
    const personId = existing.rows[0].collaborator_id;
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [personId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    const updated = await client.query('UPDATE redaction_rh.documents SET archived=true,version=version+1 WHERE id=$1 AND collaborator_id=$2 AND version=$3 AND NOT archived RETURNING id', [id, personId, version]);
    if (!updated.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,document_id) VALUES ($1,$2,$3,$4)', [actor, 'document_archive', personId, id]);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
/** Vérification du lien et journalisation dans la transaction de lecture du fichier. */
export async function downloadDocument(id: string, actor: string, principal?: import('./principal').RhPrincipal): Promise<{ bytes: Buffer; fileType: import('./documents').DocumentFileType } | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT collaborator_id FROM redaction_rh.documents WHERE id=$1', [id]);
    if (!existing.rowCount) { await client.query('ROLLBACK'); return null; }
    const personId = existing.rows[0].collaborator_id;
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [personId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return null; }
    const data = principal
      ? await client.query(`SELECT d.file_bytes,d.file_type FROM redaction_rh.documents d JOIN redaction_rh.document_shares s ON s.document_id=d.id AND s.collaborator_id=d.collaborator_id JOIN redaction_rh.account_links l ON l.collaborator_id=s.collaborator_id AND l.account_id=s.account_id AND l.account_email=s.account_email WHERE d.id=$1 AND d.collaborator_id=$2 AND NOT d.archived AND l.account_id=$3 AND l.account_email=$4`, [id, personId, principal.id, principal.email])
      : await client.query('SELECT file_bytes,file_type FROM redaction_rh.documents WHERE id=$1 AND collaborator_id=$2 AND NOT archived', [id, personId]);
    if (!data.rowCount) { await client.query('ROLLBACK'); return null; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,document_id) VALUES ($1,$2,$3,$4)', [actor, 'document_download', personId, id]);
    await client.query('COMMIT'); return { bytes: data.rows[0].file_bytes, fileType: data.rows[0].file_type };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

/** Initialisation unique, irréversible dans l'application, sans demandes antérieures. */
export async function createOpeningBalance(input: import('./opening-balances').OpeningBalanceInput, actor: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [input.collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    const link = await client.query('SELECT account_email FROM redaction_rh.account_links WHERE collaborator_id=$1', [input.collaboratorId]);
    if (!mayReviewWithdrawal(actor, link.rows[0]?.account_email ?? '', link.rows[0]?.account_email ?? null)) { await client.query('ROLLBACK'); return false; }
    // Aucune réinitialisation automatique si des retraits existent déjà, même annulés.
    const existing = await client.query('SELECT 1 FROM redaction_rh.withdrawals WHERE collaborator_id=$1 AND currency=$2 LIMIT 1', [input.collaboratorId, input.currency]);
    if (existing.rowCount) { await client.query('ROLLBACK'); return false; }
    const id = randomUUID();
    const inserted = await client.query(`INSERT INTO redaction_rh.opening_balances (id,collaborator_id,currency,through_month,amount_minor) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (collaborator_id,currency) DO NOTHING RETURNING id`, [id, input.collaboratorId, input.currency, `${input.throughMonth}-01`, input.amountMinor]);
    if (!inserted.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,opening_balance_id) VALUES ($1,$2,$3,$4)', [actor, 'opening_balance_create', input.collaboratorId, id]);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

const adjustmentCols = `id,currency,direction,amount_minor::text AS "amountMinor",reason,status,version,created_at AS "createdAt",validated_at AS "validatedAt"`;
export async function listAdjustments(collaboratorId: string): Promise<import('./adjustments').Adjustment[]> {
  return (await db().query(`SELECT ${adjustmentCols} FROM redaction_rh.balance_adjustments WHERE collaborator_id=$1 ORDER BY created_at DESC,id LIMIT 500`, [collaboratorId])).rows;
}
export async function listMyAdjustments(principal: import('./principal').RhPrincipal): Promise<import('./adjustments').Adjustment[]> {
  return (await db().query(`SELECT a.id,a.currency,a.direction,a.amount_minor::text AS "amountMinor",a.reason,a.status,a.version,a.created_at AS "createdAt",a.validated_at AS "validatedAt" FROM redaction_rh.balance_adjustments a JOIN redaction_rh.collaborators c ON c.id=a.collaborator_id JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived AND a.status='validated' ORDER BY a.created_at DESC,a.id LIMIT 500`, [principal.id, principal.email])).rows;
}
export async function createAdjustment(input: import('./adjustments').AdjustmentInput, actor: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [input.collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    const opening = await client.query('SELECT 1 FROM redaction_rh.opening_balances WHERE collaborator_id=$1 AND currency=$2', [input.collaboratorId, input.currency]);
    if (!opening.rowCount) { await client.query('ROLLBACK'); return false; }
    const id = randomUUID();
    await client.query('INSERT INTO redaction_rh.balance_adjustments (id,collaborator_id,currency,direction,amount_minor,reason) VALUES ($1,$2,$3,$4,$5,$6)', [id,input.collaboratorId,input.currency,input.direction,input.amountMinor,input.reason]);
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,adjustment_id) VALUES ($1,$2,$3,$4)', [actor,'adjustment_create',input.collaboratorId,id]);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function decideAdjustment(id: string, version: number, action: 'validate' | 'cancel', actor: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const candidate = await client.query('SELECT collaborator_id FROM redaction_rh.balance_adjustments WHERE id=$1', [id]);
    if (!candidate.rowCount) { await client.query('ROLLBACK'); return false; }
    const collaboratorId = candidate.rows[0].collaborator_id;
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    const link = await client.query('SELECT account_email FROM redaction_rh.account_links WHERE collaborator_id=$1', [collaboratorId]);
    if (!mayReviewWithdrawal(actor, link.rows[0]?.account_email ?? '', link.rows[0]?.account_email ?? null)) { await client.query('ROLLBACK'); return false; }
    const current = await client.query(`SELECT currency,direction,amount_minor::text AS amount FROM redaction_rh.balance_adjustments WHERE id=$1 AND collaborator_id=$2 AND version=$3 AND status='draft' FOR UPDATE`, [id,collaboratorId,version]);
    if (!current.rowCount) { await client.query('ROLLBACK'); return false; }
    if (action === 'validate') {
      const balances = await client.query(balanceSql, [collaboratorId]);
      const balance = balances.rows.find((row) => row.currency === current.rows[0].currency);
      const after = balance ? availableAfterAdjustment(balance, current.rows[0].direction, current.rows[0].amount) : null;
      if (after === null || after < BigInt(0)) { await client.query('ROLLBACK'); return false; }
    }
    const status = action === 'validate' ? 'validated' : 'cancelled';
    const result = await client.query(`UPDATE redaction_rh.balance_adjustments SET status=$1::varchar,validated_at=CASE WHEN $1::varchar='validated' THEN now() ELSE NULL END,version=version+1 WHERE id=$2 AND collaborator_id=$3 AND version=$4 AND status='draft' RETURNING id`, [status,id,collaboratorId,version]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,adjustment_id) VALUES ($1,$2,$3,$4)', [actor,`adjustment_${action}`,collaboratorId,id]);
    if (action === 'validate') await queueRhNotification(client, collaboratorId, 'remuneration', id, version+1);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

const disputeCols = `id,category,message,status,response,version,created_at AS "createdAt",resolved_at AS "resolvedAt"`;
export async function listMyDisputes(principal: import('./principal').RhPrincipal): Promise<import('./disputes').Dispute[]> {
  return (await db().query(`SELECT d.id,d.category,d.message,d.status,d.response,d.version,d.created_at AS "createdAt",d.resolved_at AS "resolvedAt" FROM redaction_rh.disputes d JOIN redaction_rh.collaborators c ON c.id=d.collaborator_id JOIN redaction_rh.account_links l ON l.collaborator_id=c.id AND l.account_id=d.requester_account_id AND l.account_email=d.requester_email WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived ORDER BY d.created_at DESC,d.id LIMIT 500`, [principal.id,principal.email])).rows;
}
export async function listOpenDisputes(): Promise<{ id: string; collaboratorId: string; firstName: string; lastName: string; category: import('./disputes').DisputeCategory; createdAt: string }[]> {
  return (await db().query(`SELECT d.id,d.collaborator_id AS "collaboratorId",c.first_name AS "firstName",c.last_name AS "lastName",d.category,d.created_at AS "createdAt" FROM redaction_rh.disputes d JOIN redaction_rh.collaborators c ON c.id=d.collaborator_id WHERE d.status='open' AND NOT c.archived ORDER BY d.created_at ASC,d.id LIMIT 100`)).rows;
}
export async function listDisputes(collaboratorId: string): Promise<import('./disputes').Dispute[]> {
  return (await db().query(`SELECT ${disputeCols} FROM redaction_rh.disputes WHERE collaborator_id=$1 ORDER BY created_at DESC,id LIMIT 500`, [collaboratorId])).rows;
}
export async function createMyDispute(principal: import('./principal').RhPrincipal, input: { key: string; category: import('./disputes').DisputeCategory; message: string }): Promise<import('./disputes').Dispute | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query(`SELECT c.id FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived FOR UPDATE OF c`, [principal.id,principal.email]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return null; }
    const id = person.rows[0].id;
    const link = await client.query('SELECT 1 FROM redaction_rh.account_links WHERE collaborator_id=$1 AND account_id=$2 AND account_email=$3',[id,principal.id,principal.email]);
    if (!link.rowCount) { await client.query('ROLLBACK'); return null; }
    const result = await client.query(`INSERT INTO redaction_rh.disputes (id,collaborator_id,requester_account_id,requester_email,idempotency_key,category,message) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (requester_account_id,idempotency_key) DO NOTHING RETURNING ${disputeCols}`, [randomUUID(),id,principal.id,principal.email,input.key,input.category,input.message]);
    if (!result.rowCount) {
      const previous = await client.query(`SELECT ${disputeCols} FROM redaction_rh.disputes WHERE collaborator_id=$1 AND requester_account_id=$2 AND requester_email=$3 AND idempotency_key=$4 AND category=$5 AND message=$6`,[id,principal.id,principal.email,input.key,input.category,input.message]);
      if (!previous.rowCount) { await client.query('ROLLBACK'); return null; }
      await client.query('COMMIT'); return previous.rows[0];
    }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,dispute_id) VALUES ($1,$2,$3,$4)',[principal.email,'dispute_create',id,result.rows[0].id]);
    await queueManagementEvent(client, 'contestation', result.rows[0].id);
    await client.query('COMMIT'); return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
export async function cancelMyDispute(principal: import('./principal').RhPrincipal, id: string, version: number): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query(`SELECT c.id FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived FOR UPDATE OF c`, [principal.id,principal.email]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    const collaboratorId = person.rows[0].id;
    const linked = await client.query('SELECT 1 FROM redaction_rh.account_links WHERE collaborator_id=$1 AND account_id=$2 AND account_email=$3',[collaboratorId,principal.id,principal.email]);
    if (!linked.rowCount) { await client.query('ROLLBACK'); return false; }
    const result = await client.query(`UPDATE redaction_rh.disputes SET status='cancelled',version=version+1 WHERE id=$1 AND collaborator_id=$2 AND requester_account_id=$3 AND requester_email=$4 AND version=$5 AND status='open' RETURNING id`, [id,collaboratorId,principal.id,principal.email,version]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,dispute_id) VALUES ($1,$2,$3,$4)',[principal.email,'dispute_cancel',collaboratorId,id]);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
export async function answerDispute(id: string, version: number, response: string, actor: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const record = await client.query('SELECT collaborator_id,requester_account_id,requester_email FROM redaction_rh.disputes WHERE id=$1',[id]);
    if (!record.rowCount) { await client.query('ROLLBACK'); return false; }
    const collaboratorId = record.rows[0].collaborator_id;
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE',[collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return false; }
    const link = await client.query('SELECT account_id,account_email FROM redaction_rh.account_links WHERE collaborator_id=$1',[collaboratorId]);
    if (!link.rowCount || link.rows[0].account_id !== record.rows[0].requester_account_id || link.rows[0].account_email !== record.rows[0].requester_email || !mayReviewWithdrawal(actor,record.rows[0].requester_email,link.rows[0]?.account_email ?? null)) { await client.query('ROLLBACK'); return false; }
    const result = await client.query(`UPDATE redaction_rh.disputes SET status='answered',response=$1,resolved_at=now(),version=version+1 WHERE id=$2 AND collaborator_id=$3 AND version=$4 AND status='open' RETURNING id`, [response,id,collaboratorId,version]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id,dispute_id) VALUES ($1,$2,$3,$4)',[actor,'dispute_answer',collaboratorId,id]);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
