import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCollaborator } from '../apps/redaction/src/lib/redaction/rh/collaborator.ts';
import { isAllowedRhOrigin } from '../apps/redaction/src/lib/redaction/rh/security.ts';

const valid = { firstName: '  Alice ', lastName: 'Exemple', jobTitle: 'Monteuse vidéo', team: 'Production audiovisuelle', contractStatus: 'Salariée', startDate: '2024-02-29' };
test('valide uniquement les champs professionnels attendus', () => {
  assert.deepEqual(validateCollaborator({ ...valid, salary: '1000' }), { ...valid, firstName: 'Alice' });
  assert.equal(validateCollaborator({ ...valid, startDate: '' }).startDate, null);
  for (const v of [null, [], {}, { ...valid, firstName: '  ' }, { ...valid, team: 'x'.repeat(151) }, { ...valid, jobTitle: 'a\nB' }, { ...valid, startDate: '2023-02-29' }, { ...valid, startDate: '1899-12-31' }]) assert.equal(validateCollaborator(v), null);
});
test('origines explicitement autorisées pour les écritures en production', () => {
  const allowed = 'https://wab-infos.com/redaction,https://redaction.example.com';
  const url = 'http://internal:3001/api/redaction/rh/collaborateurs';
  assert.equal(isAllowedRhOrigin('https://wab-infos.com', allowed, url, false), true);
  assert.equal(isAllowedRhOrigin('https://redaction.example.com', allowed, url, false), true);
  for (const origin of [null, 'null', 'https://evil.example', 'https://wab-infos.com.evil.example', 'https://wab-infos.com/path']) assert.equal(isAllowedRhOrigin(origin, allowed, url, false), false);
  assert.equal(isAllowedRhOrigin('http://internal:3001', '', url, false), false);
  assert.equal(isAllowedRhOrigin('http://internal:3001', '', url, true), true);
});
