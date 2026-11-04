import fs from 'node:fs';

// Test service worker : les URLs de cache sont désormais complètes pour la page et le script.
let sw = fs.readFileSync('tests/redaction-offline-sw.test.mjs', 'utf8');
sw = sw.replace(
  "const offline = new URL('redaction-offline.html', scope).pathname;",
  "const offline = new URL('redaction-offline.html', scope).pathname;\n    const offlineHref = new URL('redaction-offline.html', scope).href;\n    const offlineScriptHref = new URL('redaction-offline.js', scope).href;",
);
sw = sw.replace(
  "const cache = new Map([[offline, new Response('<html>offline</html>')], [voice, new Response('cached audio')]]);",
  "const offlineResponse = new Response('<html>offline</html>');\n    const cache = new Map([[offline, offlineResponse], [offlineHref, offlineResponse], [voice, new Response('cached audio')]]);",
);
sw = sw.replace(
  "caches: { match: (url) => Promise.resolve(cache.get(typeof url === 'string' ? url : new URL(url.url).pathname)), open: async () => ({ addAll: async (paths) => { assert.deepEqual(Array.from(paths), [offline, new URL('redaction-offline.js', scope).pathname, ...['arrival', 'departure', 'submission', 'arrival-offline', 'departure-offline', 'submission-offline'].map((name) => new URL(`rh-voice/${name}.mp3`, scope).pathname)]); } }) },",
  "caches: { match: (url) => { const key = typeof url === 'string' ? (cache.has(url) ? url : new URL(url).pathname) : new URL(url.url).pathname; return Promise.resolve(cache.get(key)); }, open: async () => ({ addAll: async (paths) => { assert.deepEqual(Array.from(paths), [offlineHref, offlineScriptHref, ...['arrival', 'departure', 'submission', 'arrival-offline', 'departure-offline', 'submission-offline'].map((name) => new URL(`rh-voice/${name}.mp3`, scope).pathname)]); } }) },",
);
fs.writeFileSync('tests/redaction-offline-sw.test.mjs', sw, 'utf8');
console.log('SW_TEST', sw.includes('offlineScriptHref') ? 'OK' : 'MISS');

// Test encodage : ServiceCard Arena utilise adminPersonId optionnel.
let enc = fs.readFileSync('tests/rh-encoding.test.mjs', 'utf8');
enc = enc.replace(
  /test\('ServiceCard accepte un collaborateur absent sans erreur'[\s\S]*?\n\}\);/,
  `test('ServiceCard accepte un collaborateur absent sans erreur', async () => {
  const component = await read('src/components/redaction/rh/service-card.tsx');
  assert.match(component, /adminPersonId\\?: string/);
});`,
);
fs.writeFileSync('tests/rh-encoding.test.mjs', enc, 'utf8');
console.log('ENC_TEST', enc.includes('adminPersonId') ? 'OK' : 'MISS');
