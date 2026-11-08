import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitA4Page } from '../apps/redaction/src/lib/redaction/rh/pdf-page-fit.ts';

test('le reçu est ajusté sans découpage sur une seule page A4', () => {
  for (const [width,height] of [[1520,2200],[640,2600],[1600,900]]) {
    const fit=fitA4Page(width,height);
    assert.ok(fit.x >= 0 && fit.y >= 0);
    assert.ok(fit.x + fit.width <= 210 + 1e-9);
    assert.ok(fit.y + fit.height <= 287 + 1e-9);
    assert.ok(Math.abs(fit.width / fit.height - width / height) < 1e-10);
  }
  assert.throws(() => fitA4Page(0,100));
});
