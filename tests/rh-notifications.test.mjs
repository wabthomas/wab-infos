import test from 'node:test';
import assert from 'node:assert/strict';
import { rhNotificationMessage } from '../apps/redaction/src/lib/redaction/rh/notifications.ts';
test('messages génériques sans montant, date ou motif financier', () => {
  const remuneration = rhNotificationMessage('remuneration');
  assert.equal(remuneration, rhNotificationMessage('retrait'));
  assert.doesNotMatch(remuneration, /salaire|paiement|retrait|CDF|USD|\d/i);
  assert.match(rhNotificationMessage('absence'), /demande/);
  assert.match(rhNotificationMessage('prestation'), /déclaration/);
});
