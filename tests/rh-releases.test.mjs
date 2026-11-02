import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import releases from '../apps/redaction/src/lib/redaction/rh/releases.json' with { type: 'json' };

test('annonces RH identifiables, adressées seulement aux pages internes', () => {
  assert.ok(releases.length > 0);
  assert.equal(new Set(releases.map((item) => item.id)).size, releases.length);
  for (const item of releases) {
    assert.match(item.id, /^rh-[0-9a-z-]{1,95}$/);
    assert.ok(item.title && item.body && item.highlights.length);
    assert.match(item.url, /^\/mon-rh(?:\/|$)/);
  }
});
