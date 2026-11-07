import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { contractProgress } from '../apps/redaction/src/lib/redaction/rh/contract-lifecycle.ts';

const id='95f79863-6507-4c20-a855-fcf8f6991689', person='6eb981c5-f9ea-41f0-9e2c-e26a75ec1ca0';
test('étapes et rappels CDD (60 jours, terme, dépassé) sans renouvellement automatique', () => {
  assert.equal(contractProgress('proposed','CDD','2026-01-01','2026-12-01','2026-11-01').stage,1);
  assert.equal(contractProgress('pending_approval','CDD','2026-01-01','2026-12-01','2026-11-01').stage,2);
  assert.equal(contractProgress('accepted','CDI','2026-01-01',null,'2026-11-01').reminder,null);
  assert.equal(contractProgress('accepted','CDD','2026-12-01','2027-12-01','2026-11-01').reminder,null);
  assert.match(contractProgress('accepted','CDD','2026-01-01','2026-12-01','2026-11-01').reminder,/30 jours/);
  assert.match(contractProgress('accepted','CDD','2026-01-01','2026-12-01','2026-12-01').reminder,/aujourd’hui/);
  assert.match(contractProgress('accepted','CDD','2026-01-01','2026-12-01','2026-12-02').reminder,/dépassé/);
});

test('migration depuis ancien schéma : signature soumise puis approbation distincte et rappel unique', async () => {
  const db=new PGlite();
  try {
    await db.exec('CREATE SCHEMA redaction_rh; CREATE TABLE redaction_rh.collaborators(id uuid PRIMARY KEY);');
    await db.query('INSERT INTO redaction_rh.collaborators(id) VALUES($1)',[person]);
    const prior=await readFile(new URL('../docs/sql/rh-contract-workflow.sql',import.meta.url),'utf8');
    // Reconstruct an existing database with the pre-approval constraints.
    await db.exec(prior.replace('status varchar(20)', 'status varchar(12)').replace("'draft','proposed','pending_approval','accepted','declined','archived'","'draft','proposed','accepted','declined','archived'")
      .replace(/  CHECK \(status <> 'pending_approval'[^\n]*\n/, '')
      .replace('CREATE TABLE IF NOT EXISTS redaction_rh.contract_reminders (','CREATE TABLE IF NOT EXISTS redaction_rh.contract_reminders_legacy ('));
    await db.exec(await readFile(new URL('../docs/sql/rh-contract-approval.sql',import.meta.url),'utf8'));
    await db.query(`INSERT INTO redaction_rh.contract_cases(id,collaborator_id,kind,job_title,work_location,start_date,end_date,salary,currency,clauses,prepared_by,status,proposed_at,legal_reviewed_by,employer_snapshot,proposed_account_id,proposed_account_email)
      VALUES($1,$2,'CDD','Journaliste','Goma','2026-01-01','2026-12-01',100,'USD','Texte','admin@example.test','proposed',now(),'admin@example.test','{}',1,'employee@example.test')`,[id,person]);
    await assert.rejects(()=>db.query("UPDATE redaction_rh.contract_cases SET status='pending_approval' WHERE id=$1",[id]));
    await db.query(`UPDATE redaction_rh.contract_cases SET status='pending_approval',consent_company_rules=true,consent_work_rules=true,employee_signature='Personne Exemple',employee_signature_bytes=$2,employee_account_id=1,employee_account_email='employee@example.test',accepted_at=now(),pdf_bytes=$3,pdf_sha256=$4 WHERE id=$1`,[id,Buffer.from('image'),Buffer.from('%PDF-'),Buffer.alloc(32)]);
    assert.equal((await db.query("SELECT status FROM redaction_rh.contract_cases WHERE id=$1",[id])).rows[0].status,'pending_approval');
    await db.query("UPDATE redaction_rh.contract_cases SET status='accepted',approved_at=now(),approved_by='admin@example.test' WHERE id=$1",[id]);
    assert.equal((await db.query('SELECT approved_by FROM redaction_rh.contract_cases WHERE id=$1',[id])).rows[0].approved_by,'admin@example.test');
    assert.equal((await db.query('INSERT INTO redaction_rh.contract_reminders(contract_id,days_before) VALUES($1,30) ON CONFLICT DO NOTHING RETURNING contract_id',[id])).rowCount,1);
    assert.equal((await db.query('INSERT INTO redaction_rh.contract_reminders(contract_id,days_before) VALUES($1,30) ON CONFLICT DO NOTHING RETURNING contract_id',[id])).rowCount,0);
  } finally { await db.close(); }
});
