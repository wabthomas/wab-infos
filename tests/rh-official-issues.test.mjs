import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import QRCode from 'qrcode';
import { planOfficialPage } from '../apps/redaction/src/lib/redaction/rh/official-export.ts';

test('registre : en attente sans vérification, puis édition figée', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE SCHEMA redaction_rh');
    await db.exec(await readFile(new URL('../docs/sql/rh-official-issues.sql', import.meta.url), 'utf8'));
    const id = '3bfe57c1-6220-4619-a52c-ac7ae34d3dfa';
    const tokenHash = createHash('sha256').update('example-private-token').digest();
    const contentHash = createHash('sha256').update('canonical-document').digest();
    await db.query('INSERT INTO redaction_rh.official_issues(id,token_hash,kind,company_name,document_date,content_hash,snapshot,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,tokenHash,'lettre','Exemple','4 novembre 2026',contentHash,JSON.stringify({subject:'Essai'}),'rh@example.test']);
    assert.equal((await db.query("SELECT id FROM redaction_rh.official_issues WHERE status='issued'")).rowCount, 0);
    await assert.rejects(() => db.query("UPDATE redaction_rh.official_issues SET status='issued' WHERE id=$1",[id]));
    const pngHash = createHash('sha256').update('example-png').digest();
    const issued = await db.query("UPDATE redaction_rh.official_issues SET status='issued',png_hash=$2,png_bytes=$3,issued_at=now() WHERE id=$1 AND status='pending' RETURNING id",[id,pngHash,Buffer.from('example-png')]);
    assert.equal(issued.rowCount,1);
    assert.equal((await db.query("UPDATE redaction_rh.official_issues SET png_bytes=$2 WHERE id=$1 AND status='pending' RETURNING id",[id,Buffer.from('substitution')])).rowCount,0);
    assert.equal((await db.query("SELECT id FROM redaction_rh.official_issues WHERE token_hash=$1 AND status='issued'",[tokenHash])).rowCount,1);
  } finally { await db.close(); }
});

test('QR de vérification : correction forte et zones de silence', () => {
  const qr = QRCode.create('https://app.wab-infos.com/verification/rh/' + 'a'.repeat(64), { errorCorrectionLevel: 'H' });
  assert.equal(qr.errorCorrectionLevel.bit, 2);
  assert.ok(qr.modules.size >= 33);
});

test('sceau, signature et QR restent dans la même page A4 lisible', () => {
  const ctx = { font: '', measureText(value) { return { width: value.length * 8 }; } };
  const settings = { companyName: 'Wab-infos', companyAddress:'',companyPhone:'',companyEmail:'',documentHeader:'', documentFooter:'RH privé', directorTitle:'Directeur général',directorName:'DG Exemple',directorSignatureWidth:'190',directorSignatureHeight:'92' };
  const assets = { 'company-logo': null, 'document-header': null, 'document-footer': null, 'director-signature':'data:image/png;base64,AA==', 'company-seal':'data:image/png;base64,AA==' };
  const doc = { kind:'communique', subject:'Information RH', body:'Un communiqué officiel concis.', recipient:'', date:'4 novembre 2026', signed:true, signatureMode:'image', settings, assets, verificationUrl:'https://app.wab-infos.com/verification/rh/'+'a'.repeat(64) };
  const layout = planOfficialPage(ctx, doc);
  assert.ok(layout.qrY !== null && layout.sealY !== null && layout.signatureY !== null);
  assert.ok(layout.qrY + 100 < layout.footerTop);
  assert.ok(layout.lines.filter(line => line.text.includes('communiqué officiel concis')).every(line => line.size >= 16));
});
