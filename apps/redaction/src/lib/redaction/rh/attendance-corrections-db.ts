import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from './database';
import { getRhFlags } from './flags';
import type { RhPrincipal } from './principal';
import type { Attendance, AttendanceCorrection, AttendanceCorrectionInput } from './attendance';

const correctionColumns = `id,collaborator_id AS "collaboratorId",work_date::text AS "workDate",
  to_char(requested_check_in,'HH24:MI') AS "checkIn",to_char(requested_check_out,'HH24:MI') AS "checkOut",
  reason,source,status,decision_note AS "decisionNote",requested_by_email AS "requestedByEmail",
  decided_by_email AS "decidedByEmail",created_at AS "createdAt",decided_at AS "decidedAt",version`;

function correctionHistory(alias: string): string {
  return `(SELECT json_build_object(
    'beforeCheckIn',to_char(h.before_check_in AT TIME ZONE 'Africa/Kinshasa','HH24:MI'),
    'afterCheckIn',to_char(h.after_check_in AT TIME ZONE 'Africa/Kinshasa','HH24:MI'),
    'beforeCheckOut',to_char(h.before_check_out AT TIME ZONE 'Africa/Kinshasa','HH24:MI'),
    'afterCheckOut',to_char(h.after_check_out AT TIME ZONE 'Africa/Kinshasa','HH24:MI'),
    'actor',h.actor_email,'createdAt',h.created_at)
    FROM redaction_rh.attendance_correction_history h WHERE h.correction_id=${alias}.id ORDER BY h.id DESC LIMIT 1) AS history`;
}

async function personFor(client: import('pg').PoolClient, principal: RhPrincipal): Promise<string | null> {
  const result = await client.query(`SELECT c.id FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived`, [principal.id, principal.email]);
  return result.rows[0]?.id ?? null;
}

export async function listMyAttendanceCorrections(principal: RhPrincipal): Promise<AttendanceCorrection[]> {
  const client = await db().connect();
  try {
    const person = await personFor(client, principal);
    if (!person) return [];
    return (await client.query(`SELECT ${correctionColumns},${correctionHistory('r')} FROM redaction_rh.attendance_corrections r WHERE r.collaborator_id=$1 ORDER BY r.created_at DESC,r.id DESC LIMIT 30`, [person])).rows;
  } finally { client.release(); }
}

export async function createMyAttendanceCorrection(principal: RhPrincipal, input: AttendanceCorrectionInput): Promise<AttendanceCorrection | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await personFor(client, principal);
    if (!person) { await client.query('ROLLBACK'); return null; }
    const result = await client.query(`INSERT INTO redaction_rh.attendance_corrections
      (id,collaborator_id,work_date,requested_check_in,requested_check_out,reason,source,requested_by_email)
      VALUES ($1,$2,$3,$4,$5,$6,'employee',$7) RETURNING ${correctionColumns}`,
      [randomUUID(), person, input.workDate, input.checkIn, input.checkOut, input.reason, principal.email]);
    await client.query(`INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,'attendance_correction_request',$2)`, [principal.email, person]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function listTeamAttendanceCorrections(from: string, to: string, status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending'): Promise<AttendanceCorrection[]> {
  const result = await db().query(`SELECT r.id,r.collaborator_id AS "collaboratorId",c.first_name AS "firstName",c.last_name AS "lastName",
    r.work_date::text AS "workDate",to_char(r.requested_check_in,'HH24:MI') AS "checkIn",to_char(r.requested_check_out,'HH24:MI') AS "checkOut",
    r.reason,r.source,r.status,r.decision_note AS "decisionNote",r.requested_by_email AS "requestedByEmail",
    r.decided_by_email AS "decidedByEmail",r.created_at AS "createdAt",r.decided_at AS "decidedAt",r.version,${correctionHistory('r')}
    FROM redaction_rh.attendance_corrections r JOIN redaction_rh.collaborators c ON c.id=r.collaborator_id
    WHERE r.work_date BETWEEN $1::date AND $2::date AND ($3='all' OR r.status=$3)
    ORDER BY CASE WHEN r.status='pending' THEN 0 ELSE 1 END,r.work_date DESC,r.created_at DESC LIMIT 1000`, [from, to, status]);
  return result.rows;
}

async function localInstant(client: import('pg').PoolClient, workDate: string, time: string | null): Promise<Date | null> {
  if (!time) return null;
  const result = await client.query(`SELECT ($1::date + $2::time) AT TIME ZONE 'Africa/Kinshasa' AS value`, [workDate, time]);
  return result.rows[0].value as Date;
}

async function applyCorrection(client: import('pg').PoolClient, correction: {
  id: string; collaboratorId: string; workDate: string; checkIn: string | null; checkOut: string | null; reason: string;
}, actor: string): Promise<Attendance | null> {
  const existing = await client.query(`SELECT check_in AS "checkIn",check_out AS "checkOut" FROM redaction_rh.attendance WHERE collaborator_id=$1 AND work_date=$2::date FOR UPDATE`, [correction.collaboratorId, correction.workDate]);
  const beforeIn = existing.rows[0]?.checkIn as Date | null ?? null;
  const beforeOut = existing.rows[0]?.checkOut as Date | null ?? null;
  const afterIn = correction.checkIn ? await localInstant(client, correction.workDate, correction.checkIn) : beforeIn;
  const afterOut = correction.checkOut ? await localInstant(client, correction.workDate, correction.checkOut) : beforeOut;
  if (!afterIn || (afterOut && afterOut < afterIn)) return null;
  const attendance = await client.query(`INSERT INTO redaction_rh.attendance (id,collaborator_id,work_date,check_in,check_out)
    VALUES ($1,$2,$3::date,$4,$5) ON CONFLICT (collaborator_id,work_date) DO UPDATE SET check_in=EXCLUDED.check_in,check_out=EXCLUDED.check_out
    RETURNING id,to_char(work_date,'YYYY-MM-DD') AS "workDate",to_char(check_in AT TIME ZONE 'Africa/Kinshasa','HH24:MI') AS "checkIn",to_char(check_out AT TIME ZONE 'Africa/Kinshasa','HH24:MI') AS "checkOut",note`,
    [randomUUID(), correction.collaboratorId, correction.workDate, afterIn, afterOut]);
  await client.query(`INSERT INTO redaction_rh.attendance_correction_history
    (correction_id,collaborator_id,work_date,before_check_in,after_check_in,before_check_out,after_check_out,reason,actor_email)
    VALUES ($1,$2,$3::date,$4,$5,$6,$7,$8,$9)`, [correction.id, correction.collaboratorId, correction.workDate, beforeIn, afterIn, beforeOut, afterOut, correction.reason, actor]);
  return attendance.rows[0];
}

export async function decideAttendanceCorrection(id: string, version: number, decision: 'approve' | 'reject', note: string, actor: string): Promise<Attendance | false | null> {
  const notificationsEnabled = (await getRhFlags()).notificationsEnabled;
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`SELECT id,collaborator_id AS "collaboratorId",work_date::text AS "workDate",
      to_char(requested_check_in,'HH24:MI') AS "checkIn",to_char(requested_check_out,'HH24:MI') AS "checkOut",reason,version,status
      FROM redaction_rh.attendance_corrections WHERE id=$1 FOR UPDATE`, [id]);
    const correction = result.rows[0];
    if (!correction || correction.status !== 'pending' || correction.version !== version) { await client.query('ROLLBACK'); return null; }
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [correction.collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return null; }
    let attendance: Attendance | null = null;
    if (decision === 'approve') {
      attendance = await applyCorrection(client, correction, actor);
      if (!attendance) { await client.query('ROLLBACK'); return null; }
    }
    const updated = await client.query(`UPDATE redaction_rh.attendance_corrections SET status=$1,decision_note=$2,decided_by_email=$3,decided_at=now(),version=version+1 WHERE id=$4 AND version=$5 AND status='pending' RETURNING id,version`, [decision === 'approve' ? 'approved' : 'rejected', note, actor, id, version]);
    if (!updated.rowCount) { await client.query('ROLLBACK'); return null; }
    await client.query(`INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,'attendance_correction_decision',$2)`, [actor, correction.collaboratorId]);
    if (notificationsEnabled) await client.query(`INSERT INTO redaction_rh.notifications (id,collaborator_id,account_id,account_email,event_type,source_id,source_version)
      SELECT $1,l.collaborator_id,l.account_id,l.account_email,'attendance_correction',$3,$4 FROM redaction_rh.account_links l WHERE l.collaborator_id=$2
      ON CONFLICT (collaborator_id,event_type,source_id,source_version) DO NOTHING`, [randomUUID(), correction.collaboratorId, id, updated.rows[0].version]);
    await client.query('COMMIT');
    return decision === 'reject' ? false : attendance;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function correctTeamAttendance(input: AttendanceCorrectionInput & { collaboratorId: string }, actor: string): Promise<Attendance | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived FOR UPDATE', [input.collaboratorId]);
    if (!person.rowCount) { await client.query('ROLLBACK'); return null; }
    const pending = await client.query(`SELECT 1 FROM redaction_rh.attendance_corrections WHERE collaborator_id=$1 AND work_date=$2 AND status='pending'`, [input.collaboratorId, input.workDate]);
    if (pending.rowCount) { await client.query('ROLLBACK'); return null; }
    const id = randomUUID();
    await client.query(`INSERT INTO redaction_rh.attendance_corrections
      (id,collaborator_id,work_date,requested_check_in,requested_check_out,reason,source,status,requested_by_email,decided_by_email,decided_at)
      VALUES ($1,$2,$3,$4,$5,$6,'admin','approved',$7,$7,now())`, [id, input.collaboratorId, input.workDate, input.checkIn, input.checkOut, input.reason, actor]);
    const attendance = await applyCorrection(client, { id, collaboratorId: input.collaboratorId, workDate: input.workDate, checkIn: input.checkIn, checkOut: input.checkOut, reason: input.reason }, actor);
    if (!attendance) { await client.query('ROLLBACK'); return null; }
    await client.query(`INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,'attendance_correction_admin',$2)`, [actor, input.collaboratorId]);
    await client.query('COMMIT');
    return attendance;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
