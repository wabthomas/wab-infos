import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync('apps/redaction/public/sw-redaction.js', 'utf8');
for (const scope of ['https://example.test/', 'https://example.test/redaction/']) {
  test(`service worker redirects offline navigations into its scope: ${scope}`, async () => {
    const listeners = {};
    const offline = new URL('redaction-offline.html', scope).pathname;
    const voice = new URL('rh-voice/arrival-offline.mp3', scope).pathname;
    const cache = new Map([[offline, new Response('<html>offline</html>')], [voice, new Response('cached audio')]]);
    const self = {
      registration: { scope }, location: { origin: 'https://example.test' },
      addEventListener: (name, listener) => { listeners[name] = listener; },
      skipWaiting() {}, clients: { claim() {} },
    };
    vm.runInNewContext(script, { self, URL, Response, fetch: () => Promise.reject(new Error('offline')),
      caches: { match: (url) => Promise.resolve(cache.get(typeof url === 'string' ? url : new URL(url.url).pathname)), open: async () => ({ addAll: async (paths) => { assert.deepEqual(Array.from(paths), [offline, new URL('redaction-offline.js', scope).pathname, ...['arrival', 'departure', 'submission', 'arrival-offline', 'departure-offline', 'submission-offline'].map((name) => new URL(`rh-voice/${name}.mp3`, scope).pathname)]); } }) },
      importScripts() {}, console });
    let installation;
    listeners.install({ waitUntil(promise) { installation = promise; } });
    await installation;
    async function handle(path, mode = 'navigate') {
      let result;
      listeners.fetch({ request: { url: `https://example.test${path}`, mode }, respondWith(promise) { result = promise; } });
      return result;
    }
    const redirect = await handle(new URL('mon-rh/presence', scope).pathname);
    assert.equal(redirect.status, 302);
    assert.equal(new URL(redirect.headers.get('location'), scope).pathname, offline);
    const page = await handle(offline);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /offline/);
    assert.equal(await (await handle(voice, 'cors')).text(), 'cached audio');
  });
}
