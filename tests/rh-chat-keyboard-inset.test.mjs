import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../apps/redaction/src/components/redaction/rh/chat.tsx', import.meta.url), 'utf8');

test('le chat utilise la hauteur IME native et visualViewport', () => {
  assert.match(source, /useEditorKeyboardInset/);
  assert.match(source, /keyboardInset/);
  assert.match(source, /keyboardBottom = window\.innerHeight/);
});

test('la hauteur du chat ne peut jamais passer sous le clavier', () => {
  assert.match(source, /Math\.min\(visualBottom, keyboardBottom\)/);
  assert.match(source, /setChatHeight/);
});

test('la hauteur est recalculée quand le clavier natif change', () => {
  assert.match(source, /\}, \[mobileView, keyboardInset\]\);/);
});
