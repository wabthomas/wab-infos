import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { parseSheetFilter, sheetQueries } from '../apps/redaction/src/lib/redaction/rh/record-sheets.ts';
import { paymentSheetTotals } from '../apps/redaction/src/lib/redaction/rh/record-sheet-totals.ts';
import { insertRecordSheetPdfSql } from '../apps/redaction/src/lib/redaction/rh/record-sheet-link-sql.ts';

test('fiches : période bornée, types et dossiers explicitement validés',()=>{
  assert.equal(parseSheetFilter({type:'presence',start:'2025-01-01',end:'2025-12-31'})?.type,'presence');
  assert.equal(parseSheetFilter({type:'presence',start:'2024-01-01',end:'2026-01-01'}),null);
  assert.equal(parseSheetFilter({type:'paiements',start:'2026-12-31',end:'2026-12-31'}),null);
  assert.equal(parseSheetFilter({type:'paiements',start:'2024-01-01',end:'2024-02-01',collaboratorId:'bad'}),null);
});

test('fiches : migrations et lignes détaillées, totaux sans doubles comptes', async()=>{
 const db=new PGlite();
 try {
  for(const name of ['initial','prestations','absences','account-links','declarations','remunerations','retraits','payouts-attendance','paiements-historiques','fiches-exports','fiches-browser'])
   await db.exec(await readFile(new URL(`../docs/sql/rh-${name}.sql`,import.meta.url),'utf8'));
  const id='aaaaaaaa-1111-4111-8111-111111111111';
  await db.query(`INSERT INTO redaction_rh.collaborators(id,first_name,last_name,job_title,team,contract_status,start_date) VALUES($1,'Anne','B','Journaliste','Rédaction','Actif','2024-01-01')`,[id]);
  await db.query(`INSERT INTO redaction_rh.account_links(collaborator_id,account_id,account_email) VALUES($1,12,'anne@example.test')`,[id]);
  await db.query(`INSERT INTO redaction_rh.attendance(id,collaborator_id,work_date,check_in,check_out) VALUES('bbbbbbbb-1111-4111-8111-111111111111',$1,'2025-05-06','2025-05-06T07:00:00Z','2025-05-06T15:00:00Z')`,[id]);
  await db.query(`INSERT INTO redaction_rh.activity_submissions(id,collaborator_id,activity_date,description) VALUES('cccccccc-1111-4111-8111-111111111111',$1,'2025-05-06','Reportage')`,[id]);
  const params=[id,'2025-05-01','2025-05-31'];
  const attendance=(await db.query(sheetQueries.presence,params)).rows;
  assert.match(attendance[0].details,/Arrivée 08:00/);
  assert.equal(attendance[0].status,'Complet');
  assert.equal((await db.query(sheetQueries.prestations,params)).rows[0].status,'À vérifier');
  const withdrawal='dddddddd-1111-4111-8111-111111111111';
  await db.query(`INSERT INTO redaction_rh.withdrawals(id,collaborator_id,idempotency_key,requester_email,currency,amount_minor,method,status,payment_date) VALUES($1,$2,$1,'anne@example.test','USD',10000,'especes','paid','2025-05-06')`,[withdrawal,id]);
  for(const [uid,amount,status,match] of [
   ['11111111-2222-4111-8111-111111111111',10000,'verified',withdrawal],
   ['22222222-2222-4111-8111-111111111111',2500,'verified',null],
   ['33333333-2222-4111-8111-111111111111',3000,'pending',null],
  ]) await db.query(`INSERT INTO redaction_rh.historical_payments(id,collaborator_id,declarant_account_id,declarant_email,idempotency_key,payment_date,currency,amount_minor,kind,method,status,verification_source,reviewer_email,reviewed_at,matched_withdrawal_id) VALUES($1,$2,12,'anne@example.test',$1,'2025-05-06','USD',$3,'prime','especes',$4,$5,$6,$7,$8)`,[uid,id,amount,status,status==='verified'?'receipt':null,status==='verified'?'other@example.test':null,status==='verified'?new Date():null,match]);
  const payments=(await db.query(sheetQueries.paiements,params)).rows;
  assert.equal(payments.length,4);
  const total=paymentSheetTotals(payments)[0][1];
  assert.equal(total.confirmed,BigInt(12500));assert.equal(total.pending,BigInt(3000));assert.equal(total.matched,1);
  await db.query(`INSERT INTO redaction_rh.record_sheet_exports(actor_email,collaborator_id,sheet_type,from_date,through_date,row_count) VALUES('anne@example.test',$1,'paiements','2025-05-01','2025-05-31',4)`,[id]);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM redaction_rh.record_sheet_exports`)).rows[0].n,1);
  const exportId=(await db.query(`SELECT id FROM redaction_rh.record_sheet_exports`)).rows[0].id;
  const pdf=Buffer.from('%PDF-1.4\n'+'x'.repeat(32)+'\n%%EOF');
  const hash='a'.repeat(64);
  const args=[hash,pdf,exportId,'anne@example.test','paiements',null,12];
  assert.equal((await db.query(insertRecordSheetPdfSql,[hash,pdf,exportId,'wrong@example.test','paiements',null,12])).rows.length,0);
  assert.equal((await db.query(insertRecordSheetPdfSql,[hash,pdf,exportId,'anne@example.test','presence',null,12])).rows.length,0);
  assert.equal((await db.query(insertRecordSheetPdfSql,[hash,pdf,exportId,'anne@example.test','paiements',null,99])).rows.length,0);
  assert.equal((await db.query(insertRecordSheetPdfSql,args)).rows.length,1);
  assert.equal(Buffer.from((await db.query(`SELECT pdf_bytes FROM redaction_rh.record_sheet_pdf_links WHERE token_hash=$1 AND expires_at>now()`,[hash])).rows[0].pdf_bytes).equals(pdf),true);
  assert.equal((await db.query(insertRecordSheetPdfSql,['b'.repeat(64),...args.slice(1)])).rows.length,0);
  await db.query(`UPDATE redaction_rh.record_sheet_pdf_links SET expires_at=now()-interval '1 second' WHERE token_hash=$1`,[hash]);
  assert.equal((await db.query(`SELECT pdf_bytes FROM redaction_rh.record_sheet_pdf_links WHERE token_hash=$1 AND expires_at>now()`,[hash])).rows.length,0);

 } finally {await db.close();}
});
