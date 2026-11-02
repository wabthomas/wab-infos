import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { validateHistoricalPayment, validateHistoricalReview } from '../apps/redaction/src/lib/redaction/rh/historical-payments.ts';
import { groupedSql, detailsSql, eventsSql } from '../apps/redaction/src/lib/redaction/rh/historical-payment-report-sql.ts';

const key = '11111111-1111-4111-8111-111111111111';
test('paiement ancien : montant exact, dates, catégories et contrôle', () => {
  const valid = { key,date:'2024-02-29',currency:'CDF',amount:'1200,50',kind:'remuneration',method:'virement',reference:'',note:'reçu' };
  assert.equal(validateHistoricalPayment(valid,'2026-11-02','2024-01-01')?.amountMinor,'120050');
  assert.equal(validateHistoricalPayment({...valid,date:'2023-12-31'},'2026-11-02','2024-01-01'),null);
  assert.equal(validateHistoricalPayment({...valid,date:'2026-11-03'},'2026-11-02',null),null);
  assert.equal(validateHistoricalPayment({...valid,amount:'0'},'2026-11-02',null),null);
  assert.equal(validateHistoricalPayment({...valid,reference:'=CMD()'},'2026-11-02',null)?.reference,'=CMD()');
  assert.equal(validateHistoricalReview({id:key,version:1,action:'verify',source:'receipt',note:'Vu',matchedWithdrawalId:null,confirmDistinct:false})?.action,'verify');
  assert.equal(validateHistoricalReview({id:key,version:1,action:'reject',note:''}),null);
});

test('migrations et bilan : déclarations non vérifiées distinctes, doublons exclus, devises séparées', async () => {
  const db = new PGlite();
  try {
    for (const name of ['initial','prestations','absences','account-links','declarations','remunerations','retraits','paiements-historiques']) {
      await db.exec(await readFile(new URL(`../docs/sql/rh-${name}.sql`, import.meta.url),'utf8'));
    }
    const person='aaaaaaaa-1111-4111-8111-111111111111';
    await db.query(`INSERT INTO redaction_rh.collaborators(id,first_name,last_name,job_title,team,contract_status,start_date) VALUES($1,'A','B','Auteur','Rédaction','Actif','2024-01-01')`,[person]);
    await db.query(`INSERT INTO redaction_rh.account_links(collaborator_id,account_id,account_email) VALUES($1,12,'alice@example.test')`,[person]);
    const withdrawal='bbbbbbbb-1111-4111-8111-111111111111';
    await db.query(`INSERT INTO redaction_rh.withdrawals(id,collaborator_id,idempotency_key,requester_email,currency,amount_minor,method,status,payment_date) VALUES($1,$2,$1,'alice@example.test','USD',10000,'especes','paid','2025-04-10')`,[withdrawal,person]);
    const insert = `INSERT INTO redaction_rh.historical_payments(id,collaborator_id,declarant_account_id,declarant_email,idempotency_key,payment_date,currency,amount_minor,kind,method,status,verification_source,reviewer_email,reviewed_at,matched_withdrawal_id) VALUES($1,$2,12,'alice@example.test',$1,'2025-04-10',$3,$4,'remuneration','especes',$5,$6,$7,$8,$9)`;
    await db.query(insert,['11111111-2222-4111-8111-111111111111',person,'USD',10000,'verified','receipt','admin@example.test',new Date(),withdrawal]);
    await db.query(insert,['22222222-2222-4111-8111-111111111111',person,'USD',3000,'verified','receipt','admin@example.test',new Date(),null]);
    await db.query(insert,['33333333-2222-4111-8111-111111111111',person,'CDF',2500,'pending',null,null,null,null]);
    await assert.rejects(db.query(insert,['44444444-2222-4111-8111-111111111111',person,'USD',10000,'verified','receipt','admin@example.test',new Date(),withdrawal]));
    const values=['2025-04-01','2025-04-30',null,null];
    const result=await db.query(groupedSql,values);
    const usd=result.rows.find(row=>row.currency==='USD');
    assert.equal(usd.recordedMinor,'10000');
    assert.equal(usd.verifiedHistoricalMinor,'3000');
    assert.equal(usd.matchedCount,1);
    const cdf=result.rows.find(row=>row.currency==='CDF');
    assert.equal(cdf.pendingMinor,'2500');
    assert.equal(cdf.verifiedHistoricalMinor,'0');
    assert.equal((await db.query(groupedSql,['2025-04-01','2025-04-30','Autre',null])).rows.length,0);
    const detail=await db.query(detailsSql,values);
    assert.equal(detail.rows.length,4);
    await db.query(`INSERT INTO redaction_rh.historical_payment_events(payment_id,actor_email,action,note) VALUES($1,'alice@example.test','declare','Saisi')`,['33333333-2222-4111-8111-111111111111']);
    assert.equal((await db.query(eventsSql,values)).rows.length,1);
    await assert.rejects(db.query(`INSERT INTO redaction_rh.historical_payments(id,collaborator_id,declarant_account_id,declarant_email,idempotency_key,payment_date,currency,amount_minor,kind,method,status) VALUES($1,$2,12,'alice@example.test',$1,'2025-04-11','USD',2000,'remuneration','especes','verified')`,['55555555-2222-4111-8111-111111111111',person]));
  } finally { await db.close(); }
});
