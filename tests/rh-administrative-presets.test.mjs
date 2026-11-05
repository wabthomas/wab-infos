import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ADMINISTRATIVE_PRESETS, unresolvedAdministrativeFields } from '../apps/redaction/src/lib/redaction/rh/administrative-presets.ts';
import { validateOfficialTemplate } from '../apps/redaction/src/lib/redaction/rh/official-documents.ts';
import { planOfficialPage } from '../apps/redaction/src/lib/redaction/rh/official-export.ts';

test('catalogue de courriers : thèmes demandés, identifiants distincts et champs à vérifier', () => {
  assert.ok(ADMINISTRATIVE_PRESETS.length >= 15);
  assert.equal(new Set(ADMINISTRATIVE_PRESETS.map(item => item.id)).size, ADMINISTRATIVE_PRESETS.length);
  for (const expected of ['Attestation de service rendu', 'Recommandation après un stage', 'Recommandation pour recherche scientifique']) {
    assert.ok(ADMINISTRATIVE_PRESETS.some(item => item.title === expected), expected);
  }
  for (const preset of ADMINISTRATIVE_PRESETS) {
    assert.equal(preset.kind, 'lettre');
    assert.ok(validateOfficialTemplate(preset), preset.id);
    assert.ok(unresolvedAdministrativeFields(preset.subject, preset.body).length, preset.id);
  }
  assert.deepEqual(unresolvedAdministrativeFields('Objet {{Nom}}', 'Bonjour {{Nom}}, {{Période}}'), ['{{Nom}}', '{{Période}}']);
  assert.deepEqual(unresolvedAdministrativeFields('Objet renseigné', 'Texte renseigné'), []);
});

test('chaque trame courte personnalisée tient sur une seule page A4 dans le format existant', () => {
  const ctx = { font: '', measureText(text) { return { width: text.length * (this.font.includes('21px') ? 11 : this.font.includes('18px') ? 9 : 7) }; } };
  const settings = { companyName: 'Wab-infos', documentHeader: 'Direction générale', companyAddress: 'Kinshasa', companyPhone: '', companyEmail: '', documentFooter: 'Document administratif', directorTitle: 'Directeur général', directorName: 'Nom du signataire' };
  const assets = { 'company-logo': null, 'document-header': null, 'document-footer': null, 'director-signature': null, 'company-seal': null };
  for (const preset of ADMINISTRATIVE_PRESETS) {
    const replace = text => text.replace(/\{\{[^{}]+\}\}/g, 'Information vérifiée');
    const doc = { kind: preset.kind, subject: replace(preset.subject), body: replace(preset.body), recipient: 'Destinataire', date: 'Kinshasa, le 4 novembre 2026', signed: false, signatureMode: 'texte', settings, assets };
    assert.doesNotThrow(() => planOfficialPage(ctx, doc), preset.id);
    assert.equal(unresolvedAdministrativeFields(doc.subject, doc.body).length, 0);
  }
});
