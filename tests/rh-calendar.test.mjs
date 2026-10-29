import test from 'node:test';
import assert from 'node:assert/strict';
import { countExpectedDays } from '../apps/redaction/src/lib/redaction/rh/calendar.ts';

test('compte les jours réels hors dimanches', () => {
  assert.equal(countExpectedDays(2026, 10), 27);
  assert.equal(countExpectedDays(2026, 2), 24);
  assert.equal(countExpectedDays(2024, 2), 25); // année bissextile
});

test('inclut les jours fériés hors dimanche et exclut les dimanches fériés', () => {
  // Le 1er janvier 2026 est un jeudi ; le 1er janvier 2023 est un dimanche.
  assert.equal(countExpectedDays(2026, 1), 27);
  assert.equal(countExpectedDays(2023, 1), 26);
});

test('rejette les périodes invalides', () => {
  for (const [year, month] of [[2026, 0], [2026, 13], [2026, 1.5], [1899, 1], [NaN, 1]]) {
    assert.throws(() => countExpectedDays(year, month), RangeError);
  }
});
