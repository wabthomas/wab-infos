import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from './database';
import type { RhPrincipal } from './principal';
import type { HistoricalPayment, HistoricalPaymentInput } from './historical-payments';

const cols = `p.id,p.collaborator_id AS "collaboratorId",to_char(p.payment_date,'YYYY-MM-DD') AS date,p.currency,p.amount_minor::text AS "amountMinor",p.kind,p.method,p.reference,p.note,p.status,p.version,p.created_at AS "submittedAt",p.reviewed_at AS "reviewedAt",p.review_note AS "reviewNote",p.verification_source AS "verificationSource",p.matched_withdrawal_id AS "matchedWithdrawalId"`;

export async function listMyHistoricalPayments(principal: RhPrincipal, page = 1): Promise<{ payments: HistoricalPayment[]; hasMore: boolean }> {
  const result = await db().query(`SELECT ${cols} FROM redaction_rh.historical_payments p
    JOIN redaction_rh.account_links l ON l.collaborator_id=p.collaborator_id
    JOIN redaction_rh.collaborators c ON c.id=p.collaborator_id
    WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived
    ORDER BY p.payment_date DESC,p.id DESC LIMIT 31 OFFSET $3`, [principal.id, principal.email, (page - 1) * 30]);
  return { payments: result.rows.slice(0, 30), hasMore: result.rows.length > 30 };
}

export async function declareHistoricalPayment(principal: RhPrincipal, input: HistoricalPaymentInput): Promise<HistoricalPayment | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const linked = await client.query(`SELECT c.id,to_char(c.start_date,'YYYY-MM-DD') AS start_date FROM redaction_rh.collaborators c
      JOIN redaction_rh.account_links l ON l.collaborator_id=c.id
      WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived FOR UPDATE OF c`, [principal.id, principal.email]);
    if (!linked.rowCount || !linked.rows[0].start_date || input.date < linked.rows[0].start_date) { await client.query('ROLLBACK'); return null; }
    const personId = linked.rows[0].id;
    const result = await client.query(`INSERT INTO redaction_rh.historical_payments
      (id,collaborator_id,declarant_account_id,declarant_email,idempotency_key,payment_date,currency,amount_minor,kind,method,reference,note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
      [randomUUID(),personId,principal.id,principal.email,input.key,input.date,input.currency,input.amountMinor,input.kind,input.method,input.reference,input.note]);
    if (result.rowCount) {
      await client.query(`INSERT INTO redaction_rh.historical_payment_events(payment_id,actor_email,action) VALUES($1,$2,'declare')`, [result.rows[0].id,principal.email]);
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }
    const existing = await db().query(`SELECT ${cols} FROM redaction_rh.historical_payments p
      WHERE p.idempotency_key=$1 AND p.collaborator_id=$2 AND p.declarant_account_id=$3
        AND p.payment_date=$4 AND p.currency=$5 AND p.amount_minor=$6 AND p.kind=$7 AND p.method=$8 AND p.reference=$9 AND p.note=$10`,
      [input.key,personId,principal.id,input.date,input.currency,input.amountMinor,input.kind,input.method,input.reference,input.note]);
    return existing.rows[0] ?? null;
  } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
  finally { client.release(); }
}

export async function cancelMyHistoricalPayment(principal: RhPrincipal, id: string, version: number): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const row = await client.query(`UPDATE redaction_rh.historical_payments p
      SET status='cancelled',version=p.version+1,updated_at=now()
      FROM redaction_rh.account_links l JOIN redaction_rh.collaborators c ON c.id=l.collaborator_id
      WHERE p.id=$1 AND p.version=$2 AND p.status='pending'
        AND p.collaborator_id=l.collaborator_id AND l.account_id=$3 AND l.account_email=$4 AND NOT c.archived RETURNING p.id`,
      [id,version,principal.id,principal.email]);
    if (!row.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query(`INSERT INTO redaction_rh.historical_payment_events(payment_id,actor_email,action) VALUES($1,$2,'cancel')`,[id,principal.email]);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function listHistoricalPaymentsForReview(status: 'pending' | 'all' = 'pending'): Promise<HistoricalPayment[]> {
  const result = await db().query(`SELECT ${cols},c.first_name AS "firstName",c.last_name AS "lastName",
      COALESCE((SELECT json_agg(json_build_object('id',w.id,'reference',w.payment_reference))
        FROM redaction_rh.withdrawals w WHERE w.collaborator_id=p.collaborator_id AND w.status='paid'
        AND w.payment_date=p.payment_date AND w.amount_minor=p.amount_minor AND w.currency=p.currency),'[]'::json) AS "possibleMatches"
    FROM redaction_rh.historical_payments p JOIN redaction_rh.collaborators c ON c.id=p.collaborator_id
    WHERE ($1::text='all' OR p.status=$1) ORDER BY p.created_at DESC,p.id DESC LIMIT 200`,[status]);
  return result.rows;
}

export async function reviewHistoricalPayment(actor: string, input: { id: string; version: number; action: 'verify' | 'reject'; source: string | null; note: string; matchedWithdrawalId: string | null; confirmDistinct: boolean }): Promise<'ok' | 'conflict' | 'self' | 'match'> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const selected = await client.query(`SELECT collaborator_id,declarant_email,to_char(payment_date,'YYYY-MM-DD') AS payment_date,amount_minor,currency,status,version
      FROM redaction_rh.historical_payments WHERE id=$1 FOR UPDATE`,[input.id]);
    if (!selected.rowCount || selected.rows[0].status !== 'pending' || selected.rows[0].version !== input.version) { await client.query('ROLLBACK'); return 'conflict'; }
    const row = selected.rows[0];
    if (row.declarant_email.toLowerCase() === actor.toLowerCase()) { await client.query('ROLLBACK'); return 'self'; }
    if (input.matchedWithdrawalId) {
      const match = await client.query(`SELECT 1 FROM redaction_rh.withdrawals WHERE id=$1 AND collaborator_id=$2 AND status='paid' AND payment_date=$3 AND amount_minor=$4 AND currency=$5`,
        [input.matchedWithdrawalId,row.collaborator_id,row.payment_date,row.amount_minor,row.currency]);
      if (!match.rowCount) { await client.query('ROLLBACK'); return 'match'; }
    }
    if (input.action === 'verify' && !input.matchedWithdrawalId && !input.confirmDistinct) {
      const duplicates = await client.query(`SELECT 1 FROM redaction_rh.withdrawals WHERE collaborator_id=$1 AND status='paid' AND payment_date=$2 AND amount_minor=$3 AND currency=$4 LIMIT 1`,[row.collaborator_id,row.payment_date,row.amount_minor,row.currency]);
      if (duplicates.rowCount) { await client.query('ROLLBACK'); return 'match'; }
    }
    const updated = await client.query(`UPDATE redaction_rh.historical_payments
      SET status=$1,review_note=$2,verification_source=$3,matched_withdrawal_id=$4,reviewer_email=$5,reviewed_at=now(),version=version+1,updated_at=now()
      WHERE id=$6 AND version=$7 AND status='pending' RETURNING id`,
      [input.action === 'verify' ? 'verified' : 'rejected',input.note,input.source,input.matchedWithdrawalId,actor,input.id,input.version]);
    if (!updated.rowCount) { await client.query('ROLLBACK'); return 'conflict'; }
    await client.query(`INSERT INTO redaction_rh.historical_payment_events(payment_id,actor_email,action,note) VALUES($1,$2,$3,$4)`,
      [input.id,actor,input.action,input.note]);
    await client.query('COMMIT'); return 'ok';
  } catch (error) { await client.query('ROLLBACK').catch(() => undefined); if ((error as {code?:string}).code === '23505') return 'match'; throw error; }
  finally { client.release(); }
}

export async function declareHistoricalPaymentForPerson(actor: { id: number; email: string }, collaboratorId: string, input: HistoricalPaymentInput): Promise<HistoricalPayment | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await client.query(`SELECT id,to_char(start_date,'YYYY-MM-DD') AS start_date FROM redaction_rh.collaborators WHERE id=$1 FOR UPDATE`,[collaboratorId]);
    if (!person.rowCount || !person.rows[0].start_date || input.date < person.rows[0].start_date || !input.note) {
      await client.query('ROLLBACK'); return null;
    }
    const created = await client.query(`INSERT INTO redaction_rh.historical_payments
      (id,collaborator_id,declarant_account_id,declarant_email,idempotency_key,payment_date,currency,amount_minor,kind,method,reference,note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
      [randomUUID(),collaboratorId,actor.id,actor.email,input.key,input.date,input.currency,input.amountMinor,input.kind,input.method,input.reference,input.note]);
    if (created.rowCount) {
      await client.query(`INSERT INTO redaction_rh.historical_payment_events(payment_id,actor_email,action,note) VALUES($1,$2,'declare',$3)`,[created.rows[0].id,actor.email,input.note]);
      await client.query('COMMIT');
    } else await client.query('ROLLBACK');
    const result = await db().query(`SELECT ${cols} FROM redaction_rh.historical_payments p WHERE p.idempotency_key=$1 AND p.collaborator_id=$2 AND p.declarant_account_id=$3 AND p.payment_date=$4 AND p.amount_minor=$5 AND p.currency=$6 AND p.kind=$7 AND p.method=$8 AND p.reference=$9 AND p.note=$10`,
      [input.key,collaboratorId,actor.id,input.date,input.amountMinor,input.currency,input.kind,input.method,input.reference,input.note]);
    return result.rows[0] ?? null;
  } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
  finally { client.release(); }
}
