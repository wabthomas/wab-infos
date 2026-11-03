import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { validateContractInput } from '../apps/redaction/src/lib/redaction/rh/contracts.ts';
const person = '6eb981c5-f9ea-41f0-9e2c-e26a75ec1ca0';
const input = { collaboratorId: person,kind:'CDD',jobTitle:'Rédacteur',workLocation:'Kinshasa',startDate:'2026-11-04',endDate:'2027-11-04',salary:'100.00',currency:'CDF',clauses:'Clauses préalablement vérifiées par un juriste.' };

test('CDD et CDI : dates réelles, champs et rémunération', () => {
  assert.deepEqual(validateContractInput(input),input);
  assert.equal(validateContractInput({...input,endDate:'2026-11-04'}),null);
  assert.equal(validateContractInput({...input,endDate:'2026-02-30'}),null);
  assert.equal(validateContractInput({...input,kind:'CDI',endDate:'2027-11-04'}),null);
  assert.equal(validateContractInput({...input,kind:'CDI',endDate:null})?.kind,'CDI');
  assert.equal(validateContractInput({...input,salary:'-5'}),null);
  assert.equal(validateContractInput({...input,clauses:'x'.repeat(12001)}),null);
  assert.equal(validateContractInput({...input,clauses:'x\n'.repeat(251)}),null);
});

test('schéma : le CDD requiert une fin, l’acceptation un PDF et une identité', async () => {
  const db=new PGlite();
  try {
    await db.exec('CREATE SCHEMA redaction_rh; CREATE TABLE redaction_rh.collaborators(id uuid PRIMARY KEY);');
    await db.query('INSERT INTO redaction_rh.collaborators(id) VALUES($1)',[person]);
    await db.exec(await readFile(new URL('../docs/sql/rh-contract-workflow.sql',import.meta.url),'utf8'));
    const values=['95f79863-6507-4c20-a855-fcf8f6991689',person,'CDD','Rédacteur','Kinshasa','2026-11-04','2027-11-04','100.00','CDF','Clauses validées','admin@example.test'];
    await db.query('INSERT INTO redaction_rh.contract_cases(id,collaborator_id,kind,job_title,work_location,start_date,end_date,salary,currency,clauses,prepared_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',values);
    await assert.rejects(()=>db.query("UPDATE redaction_rh.contract_cases SET status='accepted' WHERE id=$1",[values[0]]));
    const proposed=await db.query("UPDATE redaction_rh.contract_cases SET status='proposed',proposed_at=now(),legal_reviewed_by='admin@example.test',employer_snapshot='{}',proposed_account_id=12,proposed_account_email='employee@example.test' WHERE id=$1 RETURNING id",[values[0]]);
    assert.equal(proposed.rowCount,1);
    const declinedId='48cb2f51-f40f-43cc-b722-384e7f21cfc6';
    await db.query(`INSERT INTO redaction_rh.contract_cases(id,collaborator_id,kind,job_title,work_location,start_date,end_date,salary,currency,clauses,prepared_by,status,legal_reviewed_by,proposed_at,proposed_account_id,proposed_account_email,employer_snapshot) VALUES($1,$2,'CDI','Rédacteur','Kinshasa','2026-11-04',NULL,100,'CDF','Clauses validées','admin@example.test','proposed','juriste@example.test',now(),12,'employee@example.test','{}')`,[declinedId,person]);
    const declined=await db.query("UPDATE redaction_rh.contract_cases SET status='declined',declined_at=now() WHERE id=$1 AND status='proposed' RETURNING id",[declinedId]);
    assert.equal(declined.rowCount,1);
    assert.equal((await db.query("SELECT id FROM redaction_rh.contract_cases WHERE id=$1 AND status='proposed'",[declinedId])).rowCount,0);
    await assert.rejects(()=>db.query("UPDATE redaction_rh.contract_cases SET status='accepted' WHERE id=$1",[values[0]]));
    const accepted=await db.query("UPDATE redaction_rh.contract_cases SET status='accepted',employee_signature='Personne Exemple',employee_account_id=12,employee_account_email='employee@example.test',accepted_at=now(),pdf_bytes=$2,pdf_sha256=$3,employee_signature_bytes=$4 WHERE id=$1 RETURNING id",[values[0],Buffer.from('%PDF-1.7'),Buffer.alloc(32),Buffer.from('signed image')]);
    assert.equal(accepted.rowCount,1);
  } finally { await db.close(); }
});

test('liaison d’origine et nouvelle liaison : pas de reprise automatique du contrat transmis', async () => {
  const db=new PGlite();
  try {
    await db.exec('CREATE SCHEMA redaction_rh; CREATE TABLE redaction_rh.collaborators(id uuid PRIMARY KEY,first_name text,last_name text,archived boolean DEFAULT false); CREATE TABLE redaction_rh.account_links(collaborator_id uuid PRIMARY KEY,account_id integer,account_email text);');
    await db.query("INSERT INTO redaction_rh.collaborators(id,first_name,last_name) VALUES($1,'Personne','Exemple')",[person]);
    await db.exec(await readFile(new URL('../docs/sql/rh-contract-workflow.sql',import.meta.url),'utf8'));
    const id='95f79863-6507-4c20-a855-fcf8f6991689';
    await db.query(`INSERT INTO redaction_rh.contract_cases(id,collaborator_id,kind,job_title,work_location,start_date,end_date,salary,currency,clauses,prepared_by,status,legal_reviewed_by,proposed_at,proposed_account_id,proposed_account_email,employer_snapshot)
      VALUES($1,$2,'CDI','Rédacteur','Kinshasa','2026-11-04',NULL,100,'CDF','Clauses validées','admin@example.test','proposed','juriste@example.test',now(),12,'first@example.test','{}')`,[id,person]);
    await db.query("INSERT INTO redaction_rh.account_links(collaborator_id,account_id,account_email) VALUES($1,12,'first@example.test')",[person]);
    const select=`SELECT k.id FROM redaction_rh.contract_cases k JOIN redaction_rh.account_links l ON l.collaborator_id=k.collaborator_id JOIN redaction_rh.collaborators c ON c.id=k.collaborator_id WHERE k.id=$1 AND NOT c.archived AND l.account_id=$2 AND l.account_email=$3 AND k.proposed_account_id=l.account_id AND k.proposed_account_email=l.account_email AND k.status='proposed'`;
    assert.equal((await db.query(select,[id,12,'first@example.test'])).rowCount,1);
    await db.query("UPDATE redaction_rh.account_links SET account_id=13,account_email='second@example.test' WHERE collaborator_id=$1",[person]);
    assert.equal((await db.query(select,[id,13,'second@example.test'])).rowCount,0);
    assert.equal((await db.query(select,[id,12,'first@example.test'])).rowCount,0);
    await db.query("UPDATE redaction_rh.account_links SET account_id=12,account_email='first@example.test' WHERE collaborator_id=$1",[person]);
    await db.query('UPDATE redaction_rh.collaborators SET archived=true WHERE id=$1',[person]);
    assert.equal((await db.query(select,[id,12,'first@example.test'])).rowCount,0);
  } finally { await db.close(); }
});

test('trames CDD/CDI : version optimiste et archivage sans effacer', async () => {
  const db=new PGlite();
  try {
    await db.exec('CREATE SCHEMA redaction_rh; CREATE TABLE redaction_rh.collaborators(id uuid PRIMARY KEY);');
    await db.exec(await readFile(new URL('../docs/sql/rh-contract-workflow.sql',import.meta.url),'utf8'));
    const id='dd14f16a-caf7-43cc-8108-9ba21c7183d9';
    await db.query("INSERT INTO redaction_rh.contract_templates(id,kind,title,clauses,created_by) VALUES($1,'CDD','Trame validée','Texte juridique validé','admin@example.test')",[id]);
    const updated=await db.query("UPDATE redaction_rh.contract_templates SET clauses='Version 2',version=version+1 WHERE id=$1 AND version=1 AND NOT archived RETURNING version",[id]);
    assert.equal(updated.rows[0].version,2);
    assert.equal((await db.query('UPDATE redaction_rh.contract_templates SET archived=true WHERE id=$1 AND version=1 RETURNING id',[id])).rowCount,0);
    assert.equal((await db.query('UPDATE redaction_rh.contract_templates SET archived=true WHERE id=$1 AND version=2 RETURNING id',[id])).rowCount,1);
    assert.equal((await db.query('SELECT id FROM redaction_rh.contract_templates WHERE NOT archived')).rowCount,0);
  } finally { await db.close(); }
});

test('PDF serveur : plusieurs pages, exemplaire accepté et images DG/sceau', async () => {
  const { spawnSync } = await import('node:child_process');
  const script = `import {renderContractPdf} from './apps/redaction/src/lib/redaction/rh/contract-pdf.ts';
import sharp from 'sharp';
const image=await sharp({create:{width:20,height:20,channels:4,background:'#bd3459'}}).png().toBuffer();
const bytes=await renderContractPdf({kind:'CDI',firstName:'Personne',lastName:'Exemple',jobTitle:'Rédacteur',workLocation:'Kinshasa',startDate:'2026-11-04',endDate:null,salary:'100.00',currency:'CDF',clauses:'Clause validée. '.repeat(600),employer:{companyName:'Wab Infos',companyAddress:'Kinshasa',documentHeader:'',documentFooter:'Interne',directorName:'Directeur Exemple',directorTitle:'DG'},signatureBytes:image,sealBytes:image,employeeSignature:'Personne Exemple',employeeSignatureBytes:image,acceptedAt:'2026-11-04T10:00:00.000Z'});
if(bytes.length<1000||!bytes.toString('ascii',0,8).startsWith('%PDF-'))process.exit(2);
const count=Number(bytes.toString('latin1').match(/\\/Count (\\d+)/)?.[1]);
if(count<2)process.exit(3);
console.log(count);`;
  const run=spawnSync(process.execPath,['--conditions=react-server','--import','tsx','--input-type=module','-e',script],{cwd:new URL('../',import.meta.url).pathname,encoding:'utf8',timeout:30000});
  assert.equal(run.status,0,run.stderr||run.stdout);
});
