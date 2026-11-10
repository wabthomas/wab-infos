import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../apps/redaction/src/${path}`, import.meta.url), 'utf8');
test("retrait : Retirer de l'argent puis Moyen de paiement, sans panneau séparé", async () => {
  const [page, withdraw, payout] = await Promise.all([
    read('app/(editor)/mon-rh/retraits/page.tsx'),
    read('components/redaction/rh/my-withdrawals.tsx'),
    read('components/redaction/rh/payout-methods.tsx'),
  ]);
  assert.ok(withdraw.indexOf("Retirer de l'argent") < withdraw.indexOf('rh-open-payout-methods'));
  assert.ok(page.indexOf('<MyWithdrawals ') < page.indexOf('<PayoutMethods '));
  assert.match(payout, /addEventListener\('rh-open-payout-methods', openPanel\)/);
  assert.match(payout, /<RhFormModal open=\{formOpen\}/);
  assert.match(payout, /<RhFormModal open=\{panelOpen && !formOpen\}/);
});
test('fenêtres RH : portail hors du défilement et actions lisibles', async () => {
  const [shell, profile, prestations] = await Promise.all([
    read('components/redaction/rh/rh-form-modal.tsx'),
    read('components/redaction/rh/employee-id-card.tsx'),
    read('components/redaction/rh/my-submissions.tsx'),
  ]);
  assert.match(shell, /createPortal\(/);
  assert.match(shell, /visual\.addEventListener\('resize', resize\)/);
  assert.match(profile, /<RhFormModal open=\{editing\}/);
  assert.match(prestations, /<footer className="flex shrink-0/);
});
