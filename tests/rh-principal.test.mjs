import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRhPrincipal } from '../apps/redaction/src/lib/redaction/rh/principal.ts';
test('identité RH seulement pour un compte confirmé et non bloqué', () => {
  const account = { id: 12, email: 'Alice@Example.com', confirmed: true, blocked: false };
  assert.deepEqual(parseRhPrincipal(account), { id: 12, email: 'alice@example.com' });
  for (const bad of [null, {}, { ...account, blocked: true }, { ...account, blocked: undefined }, { ...account, confirmed: false }, { ...account, confirmed: undefined }, { ...account, id: 0 }, { ...account, id: 1.5 }, { ...account, email: 'bad' }]) assert.equal(parseRhPrincipal(bad), null);
});
