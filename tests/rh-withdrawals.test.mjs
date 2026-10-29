import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWithdrawal, validateWithdrawalDecision, mayReviewWithdrawal } from '../apps/redaction/src/lib/redaction/rh/withdrawals.ts';
const key = '01234567-89ab-cdef-0123-456789abcdef';
test('montant strict, positif, devise et moyen autorisés', () => {
  const v = { key, currency: 'CDF', amount: '12,30', method: 'mobile_money' };
  assert.deepEqual(validateWithdrawal(v), { key, currency: 'CDF', amountMinor: '1230', method: 'mobile_money' });
  for (const b of [{...v, amount:'0'}, {...v, amount:'-1'}, {...v, amount:'1.234'}, {...v, currency:'EUR'}, {...v, method:'x'}, {...v, key:'x'}]) assert.equal(validateWithdrawal(b), null);
});
test('décision et paiement validés sans date future ni refus sans motif', () => {
  assert.equal(validateWithdrawalDecision({ action:'reject', note:' ' }, '2026-01-02'), null);
  assert.equal(validateWithdrawalDecision({ action:'pay', note:'', paymentDate:'2026-01-03', paymentReference:'' }, '2026-01-02'), null);
  assert.deepEqual(validateWithdrawalDecision({ action:'pay', note:'', paymentDate:'2026-01-02', paymentReference:' Réf-1 ' }, '2026-01-02'), { action:'pay', note:'', paymentDate:'2026-01-02', paymentReference:'Réf-1' });
});

test('aucun traitement de son propre retrait ou sans lien identifiable', () => {
  assert.equal(mayReviewWithdrawal('alice@example.com', 'Alice@example.com', 'alice@example.com'), false);
  assert.equal(mayReviewWithdrawal('admin@example.com', 'alice@example.com', null), false);
  assert.equal(mayReviewWithdrawal('admin@example.com', 'alice@example.com', 'ADMIN@example.com'), false);
  assert.equal(mayReviewWithdrawal('autre@example.com', 'alice@example.com', 'alice@example.com'), true);
});
