import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('migration des signataires', () => {
  const sql = read('../docs/sql/rh-document-signatories.sql');
  assert.match(sql, /document_signatories/);
  assert.match(sql, /document_signatories_one_default_idx/);
  assert.match(sql, /director-signature/);
});

test('interface Paramètres RH : ajouter, activer, désactiver, par défaut, signature', () => {
  const ui = read('../apps/redaction/src/components/redaction/rh/signatories-settings.tsx');
  assert.match(ui, /Signataires des documents/);
  assert.match(ui, /Désactiver/);
  assert.match(ui, /Par défaut/);
  assert.match(ui, /Remplacer/);
  assert.match(ui, /\/signature/);
});

test('le signataire actif est utilisé par les documents', () => {
  assert.match(read('../apps/redaction/src/app/api/redaction/rh/organisation/route.ts'), /getActiveSignatory/);
  assert.match(read('../apps/redaction/src/app/api/redaction/rh/organisation/assets/[key]/route.ts'), /getActiveSignatory/);
  assert.match(read('../apps/redaction/src/app/api/redaction/rh/emissions/route.ts'), /getActiveSignatory/);
  assert.match(read('../apps/redaction/src/app/api/redaction/rh/contrats/route.ts'), /getActiveSignatory/);
});

test('onglet Signataires présent dans les paramètres', () => {
  assert.match(read('../apps/redaction/src/app/(editor)/rh/parametres/page.tsx'), /SignatoriesSettings/);
  assert.match(read('../apps/redaction/src/components/redaction/rh/rh-settings-tabs.tsx'), /signature: PenLine/);
});
