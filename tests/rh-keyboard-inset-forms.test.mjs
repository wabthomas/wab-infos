import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('modal RH unifié : insets IME natifs', () => {
  const source = read('../apps/redaction/src/components/redaction/rh/rh-form-modal.tsx');
  assert.match(source, /useEditorKeyboardInset/);
  assert.match(source, /keyboardBottom = window\.innerHeight/);
  assert.match(source, /Math\.min\(visualBottom, keyboardBottom\)/);
});

test('formulaires prestation et retrait : hook natif', () => {
  for (const file of ['my-submissions.tsx', 'my-withdrawals.tsx']) {
    const source = read(`../apps/redaction/src/components/redaction/rh/${file}`);
    assert.match(source, /useEditorKeyboardInset/);
    assert.match(source, /keyboardBottom = window\.innerHeight/);
  }
});

test('dialogue de pointage : passe par le modal RH', () => {
  const source = read('../apps/redaction/src/components/redaction/rh/attendance-review.tsx');
  assert.match(source, /RhFormModal/);
  assert.doesNotMatch(source, /fixed inset-0 z-\[90\]/);
});

test('sélecteur de contact du chat au-dessus du clavier', () => {
  const source = read('../apps/redaction/src/components/redaction/rh/chat.tsx');
  assert.match(source, /paddingBottom: keyboardInset/);
});

test('espace de défilement RH pour les formulaires en ligne', () => {
  const source = read('../apps/redaction/src/components/redaction/redaction-shell.tsx');
  assert.match(source, /paddingBottom: 'var\(--wab-ime-bottom, 0px\)'/);
});
