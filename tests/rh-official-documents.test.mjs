import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { validateOfficialContent, validateOfficialTemplate } from '../apps/redaction/src/lib/redaction/rh/official-documents.ts';

test('validation des brouillons et modèles officiels', () => {
  assert.deepEqual(validateOfficialTemplate({ kind: 'lettre', title: '  Invitation  ', subject: ' Objet ', body: ' Corps ' }), { kind: 'lettre', title: 'Invitation', subject: 'Objet', body: 'Corps' });
  assert.equal(validateOfficialTemplate({ kind: 'communique', title: '', subject: 'X', body: 'Y' }), null);
  assert.equal(validateOfficialTemplate({ kind: 'contrat', title: 'X', subject: 'X', body: 'Y' }), null);
  assert.equal(validateOfficialContent({ subject: 'X', body: 'A'.repeat(4001) }), null);
  assert.equal(validateOfficialContent({ subject: 'X', body: 'test\u0000secret' }), null);
});

test('migration modèles : versions, archive et événements persistants', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE SCHEMA redaction_rh');
    await db.exec(await readFile(new URL('../docs/sql/rh-official-templates.sql', import.meta.url), 'utf8'));
    const id = '3bfe57c1-6220-4619-a52c-ac7ae34d3dfa';
    await db.query('INSERT INTO redaction_rh.official_templates(id,kind,title,subject,body,created_by) VALUES($1,$2,$3,$4,$5,$6)', [id, 'lettre','Avis','Objet','Corps','rh@example.org']);
    const update = await db.query("UPDATE redaction_rh.official_templates SET body='Nouveau corps',version=version+1 WHERE id=$1 AND version=$2 AND NOT archived RETURNING version", [id,1]);
    assert.equal(update.rows[0].version, 2);
    const conflict = await db.query('UPDATE redaction_rh.official_templates SET archived=true WHERE id=$1 AND version=$2 RETURNING id', [id,1]);
    assert.equal(conflict.rowCount, 0);
    await db.query("INSERT INTO redaction_rh.official_template_events(template_id,actor_email,action) VALUES($1,$2,'update')",[id,'rh@example.org']);
    const archive = await db.query('UPDATE redaction_rh.official_templates SET archived=true WHERE id=$1 AND version=$2 RETURNING id', [id,2]);
    assert.equal(archive.rowCount, 1);
    const list = await db.query('SELECT id FROM redaction_rh.official_templates WHERE NOT archived');
    assert.equal(list.rowCount, 0);
    const events = await db.query('SELECT action FROM redaction_rh.official_template_events WHERE template_id=$1',[id]);
    assert.deepEqual(events.rows.map(row => row.action), ['update']);
  } finally { await db.close(); }
});

test('composition A4 : une page entière ou une erreur, sans tronquer le corps et la signature', async () => {
  const { planOfficialPage, OfficialPageOverflowError } = await import('../apps/redaction/src/lib/redaction/rh/official-export.ts');
  const ctx = { font: '', measureText(text) { return { width: text.length * (this.font.includes('20px') ? 10 : this.font.includes('18px') ? 9 : 7) }; } };
  const settings = { companyName: 'Wab-infos', documentHeader: 'Direction des ressources humaines', companyAddress: 'Kinshasa', companyPhone: '', companyEmail: '', documentFooter: 'Document officiel', directorTitle: 'Directeur général', directorName: 'Nom du signataire' };
  const assets = { 'company-logo': null, 'document-header': null, 'document-footer': null, 'director-signature': null };
  const doc = { kind: 'lettre', subject: 'Convocation', date: 'Kinshasa, le 3 novembre 2026', recipient: 'Madame X', body: 'Nous vous invitons à une réunion.\nVeuillez agréer nos salutations distinguées.', signed: true, signatureMode: 'texte', settings, assets };
  const layout = planOfficialPage(ctx, doc);
  assert.equal(layout.lines.filter(line => line.text.includes('salutations')).length, 1);
  assert.equal(layout.lines.some(line => line.text === settings.directorName), true);
  assert.equal(layout.signatureY, null);
  assert.throws(() => planOfficialPage(ctx, { ...doc, body: 'Une phrase trop longue pour une page A4. '.repeat(95) }), OfficialPageOverflowError);
  assert.ok(planOfficialPage(ctx, { ...doc, signatureMode: 'image' }).signatureY !== null);
  assert.throws(() => planOfficialPage(ctx, { ...doc, settings: { ...settings, documentFooter: 'Information de bas de page '.repeat(90) } }), OfficialPageOverflowError);
});
