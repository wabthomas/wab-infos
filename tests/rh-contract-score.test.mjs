import test from 'node:test';
import assert from 'node:assert/strict';
import { contractAmountForScore, validateContractEvaluation } from '../apps/redaction/src/lib/redaction/rh/contract-score.ts';

const scores = { youtube: 0, quality: 0, production: 0, interviews: 0 };
const notes = { youtube: 'Mesures Studio vérifiées.', quality: 'Évaluation éditoriale documentée.', production: 'Planning et exceptions vérifiés.', interviews: 'Exemples d’émissions examinés.' };

test('applique les montants des seuils contractuels exacts en centièmes USD', () => {
  for (const [score, amount] of [[0, '4000'], [59, '4000'], [60, '5000'], [69, '5000'], [70, '6500'], [79, '6500'], [80, '8000'], [89, '8000'], [90, '10000'], [100, '10000']]) {
    assert.equal(contractAmountForScore(score), amount);
  }
  assert.equal(contractAmountForScore(-1), null);
  assert.equal(contractAmountForScore(100.01), null);
});

test('valide quatre notes manuelles plafonnées, justifiées et calcule total + palier', () => {
  const result = validateContractEvaluation({ scores: { youtube: 36, quality: 22, production: 18, interviews: 13 }, notes });
  assert.deepEqual(result, {
    scores: { youtube: 36, quality: 22, production: 18, interviews: 13 },
    notes,
    total: 89,
    amountMinor: '8000',
    currency: 'USD',
  });
});

test('rejette les notes invalides, les justificatifs absents et les champs mal formés', () => {
  assert.equal(validateContractEvaluation(null), null);
  assert.equal(validateContractEvaluation({ scores, notes: null }), null);
  assert.equal(validateContractEvaluation({ scores: { ...scores, youtube: 41 }, notes }), null);
  assert.equal(validateContractEvaluation({ scores: { ...scores, interviews: 1.5 }, notes }), null);
  assert.equal(validateContractEvaluation({ scores, notes: { ...notes, production: '   ' } }), null);
  assert.equal(validateContractEvaluation({ scores, notes: { ...notes, quality: 'x'.repeat(2001) } }), null);
});
