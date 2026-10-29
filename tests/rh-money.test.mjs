import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyReference, formatMinorUnits, parseMonthlyAmount } from '../apps/redaction/src/lib/redaction/rh/money.ts';

test('montants exacts avec point ou virgule et sans flottants', () => {
  assert.equal(parseMonthlyAmount('600000'), 60000000n);
  assert.equal(parseMonthlyAmount(' 12,3 '), 1230n);
  assert.equal(parseMonthlyAmount('0.01'), 1n);
  assert.equal(parseMonthlyAmount('999999999999999.99'), 99999999999999999n);
  for (const input of ['', '-1', '1.234', '1,2.3', '1e3', 'Infinity', '1000000000000000', '1.']) {
    assert.equal(parseMonthlyAmount(input), null, input);
  }
});

test('référence journalière, arrondi et affichage explicites', () => {
  assert.equal(formatMinorUnits(dailyReference(parseMonthlyAmount('600000'), 24), 'CDF'), '25\u202f000,00 CDF');
  assert.equal(formatMinorUnits(dailyReference(parseMonthlyAmount('1'), 8), 'USD'), '0,13 USD');
  assert.equal(formatMinorUnits(dailyReference(parseMonthlyAmount('1'), 3), 'USD'), '0,33 USD');
  assert.equal(formatMinorUnits(dailyReference(0n, 24), 'CDF'), '0,00 CDF');
  assert.throws(() => dailyReference(1n, 0), RangeError);
  assert.throws(() => dailyReference(-1n, 24), RangeError);
  assert.throws(() => formatMinorUnits(1n, 'EUR'), RangeError);
});
