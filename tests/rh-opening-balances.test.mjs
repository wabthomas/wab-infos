import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOpeningBalance } from '../apps/redaction/src/lib/redaction/rh/opening-balances.ts';
const collaboratorId = '01234567-89ab-cdef-0123-456789abcdef';
test('initialisation explicite, montant exact et période non future', () => {
  const value = { collaboratorId, currency:'CDF', throughMonth:'2026-01', amount:'25000,50', confirmed:true };
  assert.deepEqual(validateOpeningBalance(value,'2026-01'), { collaboratorId, currency:'CDF', throughMonth:'2026-01', amountMinor:'2500050' });
  assert.equal(validateOpeningBalance({ ...value, amount:'0', currency:'USD' },'2026-01').amountMinor, '0');
  for (const bad of [{ ...value, confirmed:false }, { ...value, amount:'-1' }, { ...value, currency:'EUR' }, { ...value, throughMonth:'2026-02' }, { ...value, collaboratorId:'x' }]) assert.equal(validateOpeningBalance(bad,'2026-01'), null);
});
