import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { ORGANIZATION_ASSET_KEYS } from '../apps/redaction/src/lib/redaction/rh/organization.ts';
import { MOBILE_MONEY_PROVIDERS } from '../apps/redaction/src/lib/redaction/rh/payouts.ts';

async function source(path) {
  return readFile(new URL(`../apps/redaction/src/${path}`, import.meta.url), 'utf8');
}

test('logos Mobile Money : uniquement les opérateurs connus dans la liste blanche', () => {
  const logoKeys = ORGANIZATION_ASSET_KEYS.filter((key) => key.startsWith('payout-logo-'));
  assert.deepEqual(logoKeys.sort(), MOBILE_MONEY_PROVIDERS.map((item) => `payout-logo-${item.value}`).sort());
  assert.ok(logoKeys.every((key) => key.length <= 40));
});

test('fiche de paiement masquée : la garde couvre le chargement et la création de lien PDF', async () => {
  const exportRoute = await source('app/api/redaction/rh/fiches-exports/route.ts');
  const linkRoute = await source('app/api/redaction/rh/fiches-exports/lien/route.ts');
  const view = await source('app/(editor)/mon-rh/retraits/page.tsx');
  assert.match(exportRoute, /!filter\.collaboratorId && !flags\.paymentSheetsVisible/);
  assert.match(linkRoute, /!collaboratorId && !\(await getRhFlags\(\)\)\.paymentSheetsVisible/);
  assert.match(view, /flags\.paymentSheetsVisible && <RecordSheets type="paiements"/);
});

test('popup retrait : actions en texte ASCII non ambigu et fermeture après succès', async () => {
  const component = await source('components/redaction/rh/my-withdrawals.tsx');
  assert.match(component, /Envoi\.\.\./);
  assert.match(component, /Envoyer la demande/);
  assert.match(component, /setRequestOpen\(false\)/);
  assert.match(component, />Annuler<\/button>/);
});

test('nouvelle prestation : fenêtre mobile titrée, visible avec le clavier et fermée après envoi', async () => {
  const component = await source('components/redaction/rh/my-submissions.tsx');
  assert.match(component, /createPortal\(<div/);
  assert.match(component, /aria-modal="true" aria-labelledby="new-prestation-title"/);
  assert.match(component, /id="new-prestation-title"[^>]*>Nouvelle Prestation/);
  assert.match(component, /--rh-viewport-height/);
  assert.match(component, /viewport\.addEventListener\('resize', resize\)/);
  assert.match(component, /if \(method === 'POST'\) \{[^}]*setFormOpen\(false\)/);
  assert.match(component, /setFormOpen\(false\); setMessage\('Prestation et vidéo enregistrées/);
  assert.match(component, /setFormOpen\(false\);\s*setMessage\('Déclaration enregistrée sur cet appareil/);
});
