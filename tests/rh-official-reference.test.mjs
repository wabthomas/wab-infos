import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { formatOfficialReference, validOfficialReferenceConfig, validManualReferenceCode } from '../apps/redaction/src/lib/redaction/rh/official-reference.ts';
import { planOfficialPage } from '../apps/redaction/src/lib/redaction/rh/official-export.ts';

const migration = new URL('../docs/sql/rh-official-issues.sql', import.meta.url);

test('références uniques pour communiqués et migration réapplicable', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE SCHEMA redaction_rh');
    const sql = await readFile(migration, 'utf8');
    await db.exec(sql);
    await db.exec(sql);
    const a = await db.query("SELECT nextval('redaction_rh.official_issue_reference_seq') AS n");
    const b = await db.query("SELECT nextval('redaction_rh.official_issue_reference_seq') AS n");
    assert.equal(Number(b.rows[0].n), Number(a.rows[0].n) + 1);
    const row = ['communique','Wab Infos','4 novembre 2026',Buffer.alloc(32,2),'{}','admin@example.test'];
    const insert = (id, ref) => db.query(`INSERT INTO redaction_rh.official_issues(id,token_hash,kind,company_name,document_date,content_hash,snapshot,created_by,reference)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,Buffer.alloc(32,id.endsWith('2')?3:1),...row,ref]);
    await insert('a6c80f79-2bfa-4eb5-8122-f053c8765c01','COM-RH-2026-000001');
    await assert.rejects(() => insert('a6c80f79-2bfa-4eb5-8122-f053c8765c02','COM-RH-2026-000001'));
    const found = await db.query('SELECT reference,snapshot FROM redaction_rh.official_issues WHERE reference=$1',['COM-RH-2026-000001']);
    assert.equal(found.rows[0].reference,'COM-RH-2026-000001');
  } finally { await db.close(); }
});

test('la référence figure sur la page A4 du communiqué avec le QR', () => {
  const ctx = { font:'', measureText(text) { return { width: text.length * 8 }; } };
  const doc = {
    kind:'communique', subject:'Information RH',body:'Nous informons les collaborateurs de la réunion.',
    date:'Kinshasa, le 4 novembre 2026', recipient:'', signed:true, signatureMode:'texte',
    reference:'COM-RH-2026-000001', verificationUrl:'https://app.wab-infos.com/verification/rh/'+'a'.repeat(64),
    settings:{companyName:'Wab Infos',companyAddress:'Kinshasa',companyPhone:'',companyEmail:'',documentHeader:'',documentFooter:'RH',directorTitle:'DG',directorName:'Directeur Exemple'},
    assets:{'company-logo':null,'document-header':null,'document-footer':null,'director-signature':null,'company-seal':null},
  };
  const layout=planOfficialPage(ctx,doc);
  assert.ok(layout.lines.some(line=>line.text==='Réf. : COM-RH-2026-000001'));
  assert.ok(layout.qrY !== null && layout.qrY+100 < layout.footerTop);
  assert.ok(layout.lines.some(line=>line.text==='COMMUNIQUÉ OFFICIEL'));
  assert.ok(planOfficialPage(ctx,{...doc,reference:null}).lines.some(line=>line.text.includes('attribuée à l’émission')));
});

test('configuration admin : formats automatiques/manuels, mois Kinshasa et entrées rejetées', () => {
  const instant = new Date('2026-12-31T23:30:00.000Z'); // 1 janvier à Kinshasa
  assert.equal(formatOfficialReference('automatic','DG/{AAAA}/{MM}/{SEQ:4}',instant,42),'DG/2027/01/0042');
  assert.equal(formatOfficialReference('manual','RH-{AAAA}-{REF}',instant,'ab-12'),'RH-2027-AB-12');
  assert.equal(validOfficialReferenceConfig('automatic','RH-{SEQ:6}-{SEQ:6}'),false);
  assert.equal(validOfficialReferenceConfig('manual','RH-{SEQ:6}'),false);
  assert.equal(validOfficialReferenceConfig('manual','RH-{REF} {AAAA}'),false);
  assert.equal(validOfficialReferenceConfig('manual','RH-{REF}-{MAUVAIS}'),false);
  assert.equal(validManualReferenceCode('ABC-2'),true);
  assert.equal(validManualReferenceCode('../../script'),false);
  assert.equal(validManualReferenceCode(''),false);
  assert.throws(() => formatOfficialReference('automatic','RH-{SEQ:2}',instant,0));
});
