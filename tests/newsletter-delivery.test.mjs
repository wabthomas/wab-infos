import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { claimArticleNewsletterSend } from '../apps/web/src/lib/newsletter/article-newsletter-log.ts';
import { getActiveSubscribers, isSubscriberActive, subscribeEmail, unsubscribeByToken } from '../apps/web/src/lib/newsletter/subscribers.ts';

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }); }

test('désinscription persistante, pagination et contrôle juste avant envoi', async () => {
  const previous = globalThis.fetch;
  const rows = [
    { documentId: 'one', email: 'Test@Example.org', status: 'active', unsubscribeToken: 'one' },
    { documentId: 'two', email: 'second@example.org', status: 'active', unsubscribeToken: 'two' },
    { documentId: 'three', email: 'TEST@example.org', status: 'active', unsubscribeToken: 'three' },
  ];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (init.method === 'PUT') {
      const row = rows.find((entry) => url.pathname.endsWith(`/${entry.documentId}`));
      Object.assign(row, JSON.parse(init.body).data);
      return json({ data: row });
    }
    if (init.method === 'POST') throw new Error('unexpected reactivation');
    const token = url.searchParams.get('filters[unsubscribeToken][$eq]');
    const email = url.searchParams.get('filters[email][$eqi]');
    const active = url.searchParams.get('filters[status][$eq]');
    const page = Number(url.searchParams.get('pagination[page]') || 1);
    let data = rows.filter((entry) => (!token || entry.unsubscribeToken === token) && (!email || entry.email.toLowerCase() === email.toLowerCase()) && (!active || entry.status === active));
    if (!token && !email && active) data = data.slice(page - 1, page); // simulate capped Strapi page size
    return json({ data, meta: { pagination: { pageCount: active && !token ? rows.filter((row) => row.status === active).length : 1 } } });
  };
  try {
    assert.equal((await getActiveSubscribers()).length, 2);
    assert.equal(await unsubscribeByToken('one'), true);
    assert.equal(await unsubscribeByToken('one'), true); // one-click retry is idempotent
    assert.equal(await isSubscriberActive('one', 'Test@Example.org'), false);
    assert.equal((await getActiveSubscribers()).length, 1);
    assert.deepEqual(await subscribeEmail('Test@Example.org'), { created: false, reactivated: false, blocked: true });
    assert.equal(rows[0].status, 'unsubscribed');
    assert.equal(rows[2].status, 'unsubscribed');
  } finally { globalThis.fetch = previous; }
});

test('un seul claim atomique par article, même sous appels concurrents', async () => {
  const oldFetch = globalThis.fetch;
  const oldToken = process.env.STRAPI_API_TOKEN;
  process.env.STRAPI_API_TOKEN = 'local-test-token';
  const claimed = new Set();
  globalThis.fetch = async (input, init = {}) => {
    const id = init.method === 'POST' ? JSON.parse(init.body).data.articleDocumentId : 'article-1';
    if (init.method === 'POST') {
      if (claimed.has(id)) return json({ error: 'unique' }, 400);
      claimed.add(id);
      return json({ data: { articleDocumentId: id } });
    }
    return json({ data: claimed.has(id) ? [{ articleDocumentId: id }] : [] });
  };
  try {
    const result = await Promise.all(Array.from({ length: 5 }, () => claimArticleNewsletterSend('article-1', 'slug')));
    assert.deepEqual(result.sort(), [false, false, false, false, true]);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldToken === undefined) delete process.env.STRAPI_API_TOKEN;
    else process.env.STRAPI_API_TOKEN = oldToken;
  }
});
