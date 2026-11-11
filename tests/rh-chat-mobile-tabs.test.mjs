import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../apps/redaction/src/components/redaction/rh/chat.tsx', import.meta.url), 'utf8');

test('icône de recherche dans la topbar', () => {
  assert.match(source, /aria-label="Rechercher dans la conversation"/);
});

test('options accessibles pour toute conversation', () => {
  assert.match(source, /\{active && <div className="relative shrink-0 md:hidden">/);
  assert.match(source, /Afficher le contact/);
});

test('bouton flottant distinct de l’onglet chat', () => {
  assert.match(source, /aria-label="Sélectionner un contact"/);
  assert.match(source, /<Plus className="h-6 w-6" \/>/);
  assert.doesNotMatch(source, /Sélectionner un contact"[\s\S]{0,200}<MessageCircle/);
});

test('barre basse Discussions / Forum / Contacts / Paramètres', () => {
  assert.match(source, /aria-label="Sections du chat"/);
  assert.match(source, /\['discussions', 'Discussions', MessageCircle\]/);
  assert.match(source, /\['forum', 'Forum', Users\]/);
  assert.match(source, /\['contacts', 'Contacts', UserPlus\]/);
  assert.match(source, /\['settings', 'Paramètres', Settings\]/);
});

test('onglet paramètres du chat', () => {
  assert.match(source, /mobileTab === 'settings'/);
  assert.match(source, /href="\/mon-rh\/parametres"/);
});
