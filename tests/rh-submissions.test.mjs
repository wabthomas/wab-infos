import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission, validateSubmissionDecision } from '../apps/redaction/src/lib/redaction/rh/submissions.ts';

test('déclaration : date valide non future et description obligatoire', () => {
  assert.deepEqual(validateSubmission({ date: '2026-01-01', description: '  Montage vidéo  ', collaboratorId: 'autre' }, '2026-01-02'), { date: '2026-01-01', description: 'Montage vidéo' });
  for (const item of [{ date: '2026-01-03', description: 'Montage' }, { date: '2026-02-30', description: 'A' }, { date: '2026-01-01', description: ' ' }, { date: '2026-01-01', description: 'x'.repeat(501) }, { date: '2026-01-01', description: 'a\nb' }]) assert.equal(validateSubmission(item, '2026-01-02'), null);
});
test('un refus exige un motif', () => {
  assert.equal(validateSubmissionDecision({ decision: 'reject', note: ' ' }), null);
  assert.equal(validateSubmissionDecision({ decision: 'cancel', note: '' }), null);
  assert.deepEqual(validateSubmissionDecision({ decision: 'approve', note: '' }), { decision: 'approve', note: '' });
  assert.deepEqual(validateSubmissionDecision({ decision: 'reject', note: '  Incomplet  ' }), { decision: 'reject', note: 'Incomplet' });
});
