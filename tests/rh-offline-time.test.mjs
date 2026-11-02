import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { offlineRecordedAt } from '../apps/redaction/src/lib/redaction/rh/offline-time.ts';

test('declared offline time accepts recent UTC ISO timestamps only', () => {
  const now = Date.parse('2026-11-02T12:00:00.000Z');
  assert.equal(offlineRecordedAt('2026-11-01T10:05:33.120Z', now)?.toISOString(), '2026-11-01T10:05:33.120Z');
  for (const value of ['2026-11-02', '2026-11-02T13:00:00.000Z', '2026-09-01T00:00:00.000Z', '2026-02-30T00:00:00.000Z', null]) assert.equal(offlineRecordedAt(value, now), null);
});
