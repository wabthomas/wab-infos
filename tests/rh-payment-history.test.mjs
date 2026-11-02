import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { paymentHistorySql } from '../apps/redaction/src/lib/redaction/rh/payment-history-sql.ts';
import { parseHistoryQuery } from '../apps/redaction/src/lib/redaction/rh/personal-history.ts';

test('paiements personnels : semaine, historique, pagination, compte et statut', async () => {
  const db = new PGlite();
  try {
    for (const name of ['initial', 'prestations', 'absences', 'account-links', 'declarations', 'remunerations', 'retraits']) {
      await db.exec(await readFile(new URL(`../docs/sql/rh-${name}.sql`, import.meta.url), 'utf8'));
    }
    const alice = 'aaaaaaaa-1111-1111-1111-111111111111';
    const bob = 'bbbbbbbb-1111-1111-1111-111111111111';
    for (const [person, accountId, email] of [[alice, 11, 'alice@example.test'], [bob, 12, 'bob@example.test']]) {
      await db.query(`INSERT INTO redaction_rh.collaborators(id,first_name,last_name,job_title,team,contract_status) VALUES($1,'A','B','Auteur','Rédaction','Actif')`, [person]);
      await db.query('INSERT INTO redaction_rh.account_links(collaborator_id,account_id,account_email) VALUES($1,$2,$3)', [person, accountId, email]);
    }
    async function add(index, person, date, status = 'paid') {
      const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
      await db.query(`INSERT INTO redaction_rh.withdrawals(id,collaborator_id,idempotency_key,requester_email,currency,amount_minor,method,status,payment_date)
        VALUES($1,$2,$1,'alice@example.test','USD',1000,'especes',$3,$4)`, [id, person, status, status === 'paid' ? date : null]);
      return id;
    }
    for (let i = 1; i <= 7; i++) await add(i, alice, `2026-11-${String(i + 1).padStart(2, '0')}`);
    await add(8, alice, '2026-10-31');
    await add(9, bob, '2026-11-05');
    await add(10, alice, null, 'pending');
    const sql = paymentHistorySql(`id,to_char(payment_date,'YYYY-MM-DD') AS date,status`);
    const recent = parseHistoryQuery('https://example.test/api?period=recent', new Date('2026-11-05T12:00:00Z'));
    const params = (query, accountId = 11, email = 'alice@example.test') => [accountId, email, query.from, query.to, query.limit + 1, query.offset];
    const week = await db.query(sql, params(recent));
    assert.equal(week.rows.length, 7);
    assert.equal(week.rows.slice(0, recent.limit).length, 6);
    assert.ok(week.rows.every((row) => row.status === 'paid' && row.date >= '2026-11-02'));
    const year = parseHistoryQuery('https://example.test/api?period=year&value=2026');
    assert.equal((await db.query(sql, params(year))).rows.length, 8);
    const month = parseHistoryQuery('https://example.test/api?period=month&value=2026-10');
    assert.deepEqual((await db.query(sql, params(month))).rows.map((row) => row.date), ['2026-10-31']);
    const all = parseHistoryQuery('https://example.test/api?period=all');
    const first = (await db.query(sql, params({ ...all, limit: 3 }))).rows;
    const second = (await db.query(sql, params({ ...all, limit: 3, offset: 3 }))).rows;
    assert.equal(first.length, 4);
    assert.equal(second.length, 4);
    assert.equal(new Set([...first.slice(0, 3), ...second.slice(0, 3)].map((row) => row.id)).size, 6);
    assert.equal((await db.query(sql, params(all, 12, 'alice@example.test'))).rows.length, 0);
    assert.equal((await db.query(sql, params(all, 11, 'bob@example.test'))).rows.length, 0);
    assert.deepEqual((await db.query(sql, params(all, 12, 'bob@example.test'))).rows.map((row) => row.date), ['2026-11-05']);
  } finally { await db.close(); }
});
