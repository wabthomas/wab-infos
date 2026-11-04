import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../apps/redaction/${path}`, import.meta.url), 'utf8');

test('les textes de la rédaction sont en UTF-8 propre', async () => {
  const files = [
    'src/app/layout.tsx',
    'src/app/(editor)/rh/parametres/page.tsx',
    'src/app/(editor)/mon-rh/carte-service/page.tsx',
    'src/components/redaction/rh/service-card.tsx',
  ];
  for (const file of files) {
    const source = await read(file);
    assert.ok(!/Ã[\u0080-\u00bf]|â€/.test(source), `séquence double-encodée dans ${file}`);
  }
  const layout = await read('src/app/layout.tsx');
  assert.match(layout, /title: 'Rédaction'/);
  assert.match(layout, /Application mobile de rédaction/);
});

test('ServiceCard accepte un collaborateur absent sans erreur', async () => {
  const component = await read('src/components/redaction/rh/service-card.tsx');
  assert.match(component, /adminPersonId\?: ?string/);
});

test('le service worker met en cache des URLs complètes', async () => {
  const sw = await read('public/sw-redaction.js');
  assert.match(sw, /const OFFLINE_URL = new URL\('redaction-offline\.html', self\.registration\.scope\)\.href;/);
  assert.match(sw, /const OFFLINE_SCRIPT = new URL\('redaction-offline\.js', self\.registration\.scope\)\.href;/);
  assert.match(sw, /const OFFLINE_PATH = new URL\(OFFLINE_URL\)\.pathname;/);
  assert.match(sw, /caches\.match\(OFFLINE_URL\)/);
  assert.ok(!/OFFLINE_URL = .*\.pathname;/.test(sw));
});
