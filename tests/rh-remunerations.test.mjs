import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRemuneration } from '../apps/redaction/src/lib/redaction/rh/remunerations.ts';
const collaboratorId = '01234567-89ab-cdef-0123-456789abcdef';
test('valide une rémunération manuelle avec montant exact et devise explicite', () => {
  const value = { collaboratorId, month: '2026-01', currency: 'CDF', amount: '600000,05', status: 'validated' };
  assert.deepEqual(validateRemuneration(value), { collaboratorId, month: '2026-01', currency: 'CDF', amountMinor: '60000005' });
  assert.equal(validateRemuneration({ ...value, amount: '0', currency: 'USD' }).amountMinor, '0');
  for (const bad of [{ ...value, amount: '-1' }, { ...value, amount: '1.234' }, { ...value, amount: 2 }, { ...value, currency: 'EUR' }, { ...value, month: '2026-13' }, { ...value, collaboratorId: 'autre' }]) assert.equal(validateRemuneration(bad), null);
});
