import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAbsence, validateDecision, nextAbsenceStatus } from '../apps/redaction/src/lib/redaction/rh/absences.ts';
import { daysToReview } from '../apps/redaction/src/lib/redaction/rh/activities.ts';
const person = '01234567-89ab-cdef-0123-456789abcdef';
test('validation des périodes et décisions', () => {
  const value = { collaboratorId: person, startDate: '2026-01-01', endDate: '2026-01-03', category: ' Congé annuel ', secret: 'non enregistré' };
  assert.deepEqual(validateAbsence(value), { collaboratorId: person, startDate: '2026-01-01', endDate: '2026-01-03', category: 'Congé annuel' });
  for (const bad of [{ ...value, startDate: '2026-02-30' }, { ...value, endDate: '2025-12-30' }, { ...value, endDate: '2027-01-03' }, { ...value, category: '' }]) assert.equal(validateAbsence(bad), null);
  assert.equal(validateDecision({ decision: 'reject', note: ' ' }), null);
  assert.deepEqual(validateDecision({ decision: 'reject', note: ' Motif ' }), { decision: 'reject', note: 'Motif' });
});
test('transitions autorisées et situations finales', () => {
  assert.equal(nextAbsenceStatus('pending', 'approve'), 'approved');
  assert.equal(nextAbsenceStatus('pending', 'reject'), 'rejected');
  assert.equal(nextAbsenceStatus('approved', 'cancel'), 'cancelled');
  assert.equal(nextAbsenceStatus('approved', 'reject'), null);
  assert.equal(nextAbsenceStatus('cancelled', 'approve'), null);
  assert.equal(nextAbsenceStatus('rejected', 'approve'), null);
});
test('une absence approuvée ne devient pas une journée à vérifier', () => {
  assert.deepEqual(daysToReview('2026-01', '2026-01-06', '2026-01-01', [], [{ startDate: '2025-12-31', endDate: '2026-01-03' }]), ['2026-01-05', '2026-01-06']);
});
