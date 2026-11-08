import assert from 'node:assert/strict';
import test from 'node:test';
import { assessEmailFormat, prioritizeRecipients, rankRecipient } from '../apps/redaction/src/lib/redaction/newsletter-cleanup.ts';

test('assessEmailFormat : adresses valides', () => {
  assert.equal(assessEmailFormat('marie@wab-infos.com').verdict, 'valid');
  assert.equal(assessEmailFormat('jean.dupont@gmail.com').verdict, 'valid');
  assert.equal(assessEmailFormat('  MARIE@WAB-INFOS.COM  ').email, 'marie@wab-infos.com');
});

test('assessEmailFormat : adresses invalides', () => {
  assert.equal(assessEmailFormat('pas-un-email').verdict, 'invalid');
  assert.equal(assessEmailFormat('marie@@wab-infos.com').verdict, 'invalid');
  assert.equal(assessEmailFormat('marie@mailinator.com').verdict, 'invalid');
  assert.equal(assessEmailFormat('marie@invalid').verdict, 'invalid');
  assert.equal(assessEmailFormat('marie@example.com').verdict, 'invalid');
});

test('assessEmailFormat : adresses suspectes conservées mais classées après', () => {
  const role = assessEmailFormat('info@wab-infos.com');
  assert.equal(role.verdict, 'suspicious');
  assert.ok(role.reasons.some(reason => reason.includes('rôle')));
  const typo = assessEmailFormat('marie@gmal.com');
  assert.equal(typo.verdict, 'suspicious');
  assert.ok(typo.reasons.some(reason => reason.includes('gmail')));
});

test('prioritizeRecipients : adresses personnelles avant adresses de rôle', () => {
  const ordered = prioritizeRecipients([
    { email: 'contact@wab-infos.com' },
    { email: 'jean@gmail.com' },
    { email: 'marie@wab-infos.com' },
  ]);
  assert.deepEqual(ordered.map(row => row.email), ['jean@gmail.com', 'marie@wab-infos.com', 'contact@wab-infos.com']);
  assert.equal(rankRecipient('contact@wab-infos.com'), 2);
  assert.equal(rankRecipient('jean@gmail.com'), 0);
});
