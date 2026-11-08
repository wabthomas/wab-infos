import assert from 'node:assert/strict';
import test from 'node:test';
import { orderRecipients, recipientRank } from '../apps/web/src/lib/newsletter/recipient-priority.ts';

test('les adresses Gmail passent en premier', () => {
  const ordered = orderRecipients([
    { email: 'redaction@wab-infos.com' },
    { email: 'jean@gmail.com' },
    { email: 'marie@yahoo.fr' },
    { email: 'contact@wab-infos.com' },
    { email: 'paul@googlemail.com' },
  ]);
  assert.deepEqual(ordered.map((row) => row.email), [
    'jean@gmail.com',
    'paul@googlemail.com',
    'marie@yahoo.fr',
    'redaction@wab-infos.com',
    'contact@wab-infos.com',
  ]);
  assert.equal(recipientRank('jean@gmail.com'), 0);
  assert.equal(recipientRank('paul@googlemail.com'), 0);
  assert.equal(recipientRank('marie@yahoo.fr'), 1);
  assert.equal(recipientRank('contact@gmail.com'), 2);
});
