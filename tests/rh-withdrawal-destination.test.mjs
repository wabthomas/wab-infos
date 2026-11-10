import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { adminPayoutDestinationSql } from '../apps/redaction/src/lib/redaction/rh/withdrawal-destination-sql.ts';

test('les coordonnées sont liées au dossier, à la devise et au canal du retrait', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA redaction_rh;
      CREATE TABLE redaction_rh.payout_methods(id uuid PRIMARY KEY,collaborator_id uuid,kind text,provider text,account_name text,account_number text,currency text);
      CREATE TABLE redaction_rh.withdrawals(id uuid PRIMARY KEY,collaborator_id uuid,payout_method_id uuid,method text,currency text);`);
    const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002', payout='00000000-0000-4000-8000-000000000003';
    await db.query("INSERT INTO redaction_rh.payout_methods VALUES($1,$2,'mobile_money','airtel','Exemple','0991234567','CDF')",[payout,a]);
    const view = async (owner,method,currency) => {
      const id='00000000-0000-4000-8000-000000000004';
      await db.query('DELETE FROM redaction_rh.withdrawals');
      await db.query('INSERT INTO redaction_rh.withdrawals VALUES($1,$2,$3,$4,$5)',[id,owner,payout,method,currency]);
      return (await db.query(`SELECT w.id${adminPayoutDestinationSql} FROM redaction_rh.withdrawals w WHERE w.id=$1`,[id])).rows[0].payoutDestination;
    };
    assert.equal((await view(a,'mobile_money','CDF')).accountNumber,'0991234567');
    assert.equal(await view(b,'mobile_money','CDF'),null);
    assert.equal(await view(a,'virement','CDF'),null);
    assert.equal(await view(a,'mobile_money','USD'),null);
  } finally { await db.close(); }
});
