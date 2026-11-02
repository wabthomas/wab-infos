import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseHistoryQuery, historyUrl } from '../apps/redaction/src/lib/redaction/rh/personal-history.ts';

const url = (query = '') => `https://example.test/api/redaction/rh/mon-espace/presence${query}`;

test('historique rÃ©cent et pagination bornÃ©e', () => {
  assert.deepEqual(parseHistoryQuery(url(), new Date('2026-11-02T12:00:00Z')), { period: 'recent', from: '2026-11-02', to: null, limit: 6, offset: 0 });
  assert.equal(parseHistoryQuery(url(), new Date('2026-11-08T21:59:00Z'))?.from, '2026-11-02');
  assert.equal(parseHistoryQuery(url(), new Date('2026-11-08T22:01:00Z'))?.from, '2026-11-09');
  assert.deepEqual(parseHistoryQuery(url('?period=all&page=3')), { period: 'all', from: null, to: null, limit: 30, offset: 60 });
  assert.equal(parseHistoryQuery(url('?period=all&page=10001')), null);
  assert.equal(parseHistoryQuery(url('?period=recent&page=2')), null);
  assert.equal(parseHistoryQuery(url('?period=all&value=2026')), null);
  assert.equal(parseHistoryQuery(url('?period=month&value=2026-13')), null);
  assert.equal(parseHistoryQuery(url('?period=year&value=2026%27')), null);
});

test('mois et annÃ©es sont filtrÃ©s par bornes calendaires exclusives', () => {
  assert.deepEqual(parseHistoryQuery(url('?period=month&value=2026-12&page=2')), { period: 'month', from: '2026-12-01', to: '2027-01-01', limit: 30, offset: 30 });
  assert.deepEqual(parseHistoryQuery(url('?period=year&value=2024')), { period: 'year', from: '2024-01-01', to: '2025-01-01', limit: 30, offset: 0 });
  assert.equal(parseHistoryQuery(url('?period=month&value=1899-12')), null);
  assert.equal(parseHistoryQuery(url('?period=year&value=2100')), null);
  assert.match(historyUrl('/api', 'month', '2026-03', 2), /period=month.*page=2.*value=2026-03/);
});
