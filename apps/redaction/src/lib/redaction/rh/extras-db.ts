import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from './database';
import type { RhPrincipal } from './principal';
import type { Attendance, AttendanceAction } from './attendance';
import type { PayoutMethod, PayoutMethodInput } from './payouts';
import type { RhCurrency } from './money';
import type { Withdrawal } from './withdrawals';

const withdrawalCols = `w.id,w.currency,w.amount_minor::text AS "amountMinor",w.method,w.status,w.decision_note AS "decisionNote",to_char(w.payment_date,'YYYY-MM-DD') AS "paymentDate",w.payment_reference AS "paymentReference",w.payout_method_id AS "payoutMethodId",w.payout_label AS "payoutLabel",w.version`;

async function myPerson(client: import('pg').PoolClient, principal: RhPrincipal) {
  const result = await client.query(
    `SELECT c.id FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id
     WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived`,
    [principal.id, principal.email]
  );
  return result.rows[0]?.id as string | undefined;
}

export async function listMyPayoutMethods(principal: RhPrincipal): Promise<PayoutMethod[]> {
  const client = await db().connect();
  try {
    const person = await myPerson(client, principal);
    if (!person) return [];
    const result = await client.query(
      `SELECT id,kind,provider,account_name AS "accountName",account_number AS "accountNumber",currency,active,is_default AS "isDefault",version
       FROM redaction_rh.payout_methods WHERE collaborator_id=$1 ORDER BY active DESC, created_at DESC`,
      [person]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function createMyPayoutMethod(principal: RhPrincipal, input: PayoutMethodInput): Promise<PayoutMethod | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await myPerson(client, principal);
    if (!person) {
      await client.query('ROLLBACK');
      return null;
    }
    const count = await client.query('SELECT COUNT(*)::int AS n FROM redaction_rh.payout_methods WHERE collaborator_id=$1', [person]);
    const isDefault = count.rows[0].n === 0;
    const result = await client.query(
      `INSERT INTO redaction_rh.payout_methods (id,collaborator_id,kind,provider,account_name,account_number,currency,is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id,kind,provider,account_name AS "accountName",account_number AS "accountNumber",currency,active,is_default AS "isDefault",version`,
      [randomUUID(), person, input.kind, input.provider, input.accountName, input.accountNumber, input.currency, isDefault]
    );
    await client.query(
      'INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,$2,$3)',
      [principal.email, 'payout_method_create', person]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function setMyPayoutMethodActive(
  principal: RhPrincipal,
  id: string,
  active: boolean,
  version: number
): Promise<boolean> {
  const client = await db().connect();
  try {
    const person = await myPerson(client, principal);
    if (!person) return false;
    const result = await client.query(
      `UPDATE redaction_rh.payout_methods SET active=$1,version=version+1,updated_at=now()
       WHERE id=$2 AND collaborator_id=$3 AND version=$4 RETURNING id`,
      [active, id, person, version]
    );
    return Boolean(result.rowCount);
  } finally {
    client.release();
  }
}

export async function listMyCurrencyPreferences(principal: RhPrincipal): Promise<Array<{ currency: RhCurrency; enabled: boolean }>> {
  const client = await db().connect();
  try {
    const person = await myPerson(client, principal);
    const rows = person
      ? (
          await client.query(
            'SELECT currency,enabled FROM redaction_rh.currency_preferences WHERE collaborator_id=$1',
            [person]
          )
        ).rows
      : [];
    return (['CDF', 'USD'] as const).map((currency) => ({
      currency,
      enabled: rows.find((row) => row.currency === currency)?.enabled ?? true,
    }));
  } finally {
    client.release();
  }
}

export async function setMyCurrencyPreference(
  principal: RhPrincipal,
  currency: RhCurrency,
  enabled: boolean
): Promise<boolean> {
  const client = await db().connect();
  try {
    const person = await myPerson(client, principal);
    if (!person) return false;
    await client.query(
      `INSERT INTO redaction_rh.currency_preferences (collaborator_id,currency,enabled)
       VALUES ($1,$2,$3)
       ON CONFLICT (collaborator_id,currency) DO UPDATE SET enabled=EXCLUDED.enabled,updated_at=now()`,
      [person, currency, enabled]
    );
    return true;
  } finally {
    client.release();
  }
}

export type Receipt = {
  withdrawal: Withdrawal;
  person: { firstName: string; lastName: string; jobTitle: string; team: string };
};

export async function getMyWithdrawalReceipt(principal: RhPrincipal, id: string): Promise<Receipt | null> {
  const client = await db().connect();
  try {
    const person = await myPerson(client, principal);
    if (!person) return null;
    const result = await client.query(
      `SELECT ${withdrawalCols}, c.first_name AS "firstName", c.last_name AS "lastName", c.job_title AS "jobTitle", c.team
       FROM redaction_rh.withdrawals w JOIN redaction_rh.collaborators c ON c.id=w.collaborator_id
       WHERE w.id=$1 AND w.collaborator_id=$2`,
      [id, person]
    );
    if (!result.rowCount) return null;
    const row = result.rows[0];
    return {
      withdrawal: row,
      person: { firstName: row.firstName, lastName: row.lastName, jobTitle: row.jobTitle, team: row.team },
    };
  } finally {
    client.release();
  }
}

export async function getAdminWithdrawalReceipt(id: string): Promise<Receipt | null> {
  const client = await db().connect();
  try {
    const result = await client.query(
      `SELECT ${withdrawalCols}, c.first_name AS "firstName", c.last_name AS "lastName", c.job_title AS "jobTitle", c.team
       FROM redaction_rh.withdrawals w JOIN redaction_rh.collaborators c ON c.id=w.collaborator_id WHERE w.id=$1`,
      [id]
    );
    if (!result.rowCount) return null;
    const row = result.rows[0];
    return {
      withdrawal: row,
      person: { firstName: row.firstName, lastName: row.lastName, jobTitle: row.jobTitle, team: row.team },
    };
  } finally {
    client.release();
  }
}

export async function listMyAttendance(principal: RhPrincipal): Promise<Attendance[]> {
  const client = await db().connect();
  try {
    const person = await myPerson(client, principal);
    if (!person) return [];
    const result = await client.query(
      `SELECT id,to_char(work_date,'YYYY-MM-DD') AS "workDate",
              to_char(check_in AT TIME ZONE 'Africa/Kinshasa','HH24:MI') AS "checkIn",
              to_char(check_out AT TIME ZONE 'Africa/Kinshasa','HH24:MI') AS "checkOut",note
       FROM redaction_rh.attendance WHERE collaborator_id=$1 ORDER BY work_date DESC LIMIT 60`,
      [person]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function signMyAttendance(principal: RhPrincipal, action: AttendanceAction): Promise<Attendance | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const person = await myPerson(client, principal);
    if (!person) {
      await client.query('ROLLBACK');
      return null;
    }
    const column = action === 'in' ? 'check_in' : 'check_out';
    const result = await client.query(
      `INSERT INTO redaction_rh.attendance (id,collaborator_id,work_date,${column})
       VALUES ($1,$2,(now() AT TIME ZONE 'Africa/Kinshasa')::date,now())
       ON CONFLICT (collaborator_id,work_date) DO UPDATE SET ${column}=now()
       WHERE attendance.${column} IS NULL
       RETURNING id,to_char(work_date,'YYYY-MM-DD') AS "workDate",
                 to_char(check_in AT TIME ZONE 'Africa/Kinshasa','HH24:MI') AS "checkIn",
                 to_char(check_out AT TIME ZONE 'Africa/Kinshasa','HH24:MI') AS "checkOut",note`,
      [randomUUID(), person]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(
      'INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,$2,$3)',
      [principal.email, action === 'in' ? 'attendance_in' : 'attendance_out', person]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
