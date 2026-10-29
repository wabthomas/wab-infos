import test from 'node:test';
import assert from 'node:assert/strict';
import { daysToReview, validateActivity, kinshasaToday } from '../apps/redaction/src/lib/redaction/rh/activities.ts';

const id = '01234567-89ab-cdef-0123-456789abcdef';
test('repère uniquement les journées attendues sans relevé depuis la date d’arrivée', () => {
  // Janvier 2026 : le 1er est férié, le 4 est dimanche.
  assert.deepEqual(daysToReview('2026-01', '2026-01-06', '2026-01-01', ['2026-01-02', '2026-01-05']), ['2026-01-01', '2026-01-03', '2026-01-06']);
  assert.deepEqual(daysToReview('2026-01', '2026-01-06', '2026-01-05', []), ['2026-01-05', '2026-01-06']);
  assert.deepEqual(daysToReview('2026-01', '2026-01-06', null, []), []);
  assert.deepEqual(daysToReview('2026-02', '2026-01-06', '2026-01-01', []), []);
  assert.throws(() => daysToReview('2026-13', '2026-01-06', null, []), RangeError);
});

test('valide les relevés et ne conserve que les champs attendus', () => {
  const item = { collaboratorId: id, date: '2026-02-28', status: 'effectuee', description: '  Montage  ', salary: 'secret' };
  assert.deepEqual(validateActivity(item), { collaboratorId: id, date: '2026-02-28', status: 'effectuee', description: 'Montage' });
  for (const bad of [{ ...item, date: '2026-02-29' }, { ...item, collaboratorId: 'bad' }, { ...item, description: '' }, { ...item, status: 'non_justifiee' }, { ...item, description: 'x'.repeat(501) }]) assert.equal(validateActivity(bad), null);
  assert.ok(validateActivity({ ...item, status: 'absence_signalee', description: '' }));
});

test('date de référence utilise Kinshasa, indépendamment du fuseau du serveur', () => {
  assert.equal(kinshasaToday(new Date('2026-01-01T23:30:00Z')), '2026-01-02');
});
