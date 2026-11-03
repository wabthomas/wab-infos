import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { repairLegacyMojibake } from '../apps/redaction/src/lib/redaction/rh/repair-text.ts';

test('retrait : réparer les libellés hérités sans toucher au texte Unicode valide', () => {
  for (const [input, expected] of [
    ['RÃ©munÃ©rations', 'Rémunérations'],
    ['RÃƒÂ©munÃƒÂ©rations', 'Rémunérations'],
    ['ApprouvÃ©e', 'Approuvée'],
    ['ValidÃ©es-payÃ©es', 'Validées-payées'],
    ['lâ€™administration', 'l’administration'],
    ['Orange Money Â· â€¢â€¢â€¢â€¢ 0610', 'Orange Money · •••• 0610'],
    ['Orange Money Â· •••• 0610', 'Orange Money · •••• 0610'],
    ['Orange Money · •••• 0610', 'Orange Money · •••• 0610'],
    ['Réservé · déjà payé', 'Réservé · déjà payé'],
    ['Montant 10 USD · #AB123456', 'Montant 10 USD · #AB123456'],
  ]) assert.equal(repairLegacyMojibake(input), expected);
});

test('les libellés statiques de la page Retrait sont déjà en UTF-8 dans les sources', async () => {
  const source = await readFile(new URL('../apps/redaction/src/components/redaction/rh/my-withdrawals.tsx', import.meta.url), 'utf8');
  for (const label of ['Rémunérations', 'Approuvée', 'Validées-payées', 'numéro de suivi']) {
    assert.ok(source.includes(label), `libellé absent : ${label}`);
  }
  assert.ok(!source.includes('RÃ©munÃ©rations'));
});
