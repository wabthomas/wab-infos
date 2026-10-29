import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAdjustment, availableAfterAdjustment } from '../apps/redaction/src/lib/redaction/rh/adjustments.ts';
const collaboratorId = '01234567-89ab-cdef-0123-456789abcdef';
test('ajustements : montant exact et motif obligatoire', () => {
  const input = { collaboratorId, currency:'CDF', direction:'debit', amount:'123,45', reason:' Correction de saisie ' };
  assert.deepEqual(validateAdjustment(input), { collaboratorId, currency:'CDF', direction:'debit', amountMinor:'12345', reason:'Correction de saisie' });
  for (const bad of [{...input,amount:'0'}, {...input,amount:'-1'}, {...input,direction:'retenue_auto'}, {...input,currency:'EUR'}, {...input,reason:' '}, {...input,reason:'x\ny'}]) assert.equal(validateAdjustment(bad),null);
});
test('le solde tient compte des réservations et paiements avant ajustement', () => {
  const balance = { opening:'10000', validated:'5000', adjustmentCredits:'500', adjustmentDebits:'1000', reserved:'4000', paid:'2000' };
  assert.equal(availableAfterAdjustment(balance), 8500n);
  assert.equal(availableAfterAdjustment(balance,'debit','8500'), 0n);
  assert.equal(availableAfterAdjustment(balance,'debit','8501'), -1n);
  assert.equal(availableAfterAdjustment(balance,'credit','1500'), 10000n);
  assert.equal(availableAfterAdjustment({...balance,opening:null}), null);
  assert.throws(() => availableAfterAdjustment({...balance,paid:'100000'}), RangeError);
  assert.throws(() => availableAfterAdjustment(balance,'credit','0'), RangeError);
});
