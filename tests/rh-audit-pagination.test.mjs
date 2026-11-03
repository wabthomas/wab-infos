import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { AUDIT_PAGE_SIZE, parseAuditPage } from '../apps/redaction/src/lib/redaction/rh/audit-pagination.ts';
import { auditCountSql, auditPageSql } from '../apps/redaction/src/lib/redaction/rh/audit-query.ts';

test('journal RH : lecture réservée au super-administrateur côté API et interface', async () => {
  const route = await readFile(new URL('../apps/redaction/src/app/api/redaction/rh/audit/route.ts', import.meta.url), 'utf8');
  const page = await readFile(new URL('../apps/redaction/src/app/(editor)/rh/rapports/page.tsx', import.meta.url), 'utf8');
  assert.match(route, /requireRhPermission\('hr_manage'\)/);
  assert.ok(route.indexOf("requireRhPermission('hr_manage')") < route.indexOf('db().connect()'));
  assert.match(page, /\(capabilities\.hrManage \|\| capabilities\.accessManage\) && <AuditJournal/);
});

test('journal RH : pages et références invalides rejetées avant requête SQL', () => {
  assert.deepEqual(parseAuditPage(new URLSearchParams('page=2&snapshot=42')),
    { page: 2, snapshot: '42', offset: AUDIT_PAGE_SIZE });
  for (const input of ['page=0', 'page=-1', 'page=1.5', 'page=100001', 'page=1&snapshot=-1',
    'page=1&snapshot=abc', 'page=1&snapshot=9223372036854775808']) {
    assert.equal(parseAuditPage(new URLSearchParams(input)), null, input);
  }
});

test('journal RH : pagination SQL stable, sans doublons et avec borne de chargement', async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL('../docs/sql/rh-initial.sql', import.meta.url), 'utf8'));
    const person = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await db.query(`INSERT INTO redaction_rh.collaborators(id,first_name,last_name,job_title,team,contract_status)
      VALUES($1,'Alice','Audit','Journaliste','Rédaction','Actif')`, [person]);
    for (let i = 1; i <= 42; i++) {
      await db.query(`INSERT INTO redaction_rh.audit_log(actor_email,action,collaborator_id,created_at)
        VALUES('admin@example.test',$1,$2,'2026-11-03T09:00:00Z')`, [`action_${i}`, person]);
    }
    const snapshot = String((await db.query('SELECT MAX(id) AS id FROM redaction_rh.audit_log')).rows[0].id);
    await db.query(`INSERT INTO redaction_rh.audit_log(actor_email,action,collaborator_id)
      VALUES('admin@example.test','later',$1)`, [person]);
    const count = await db.query(auditCountSql, [snapshot]);
    assert.equal(Number(count.rows[0].total), 42);
    const pages = [];
    for (let offset = 0; offset < 60; offset += AUDIT_PAGE_SIZE) {
      const result = await db.query(auditPageSql, [snapshot, AUDIT_PAGE_SIZE, offset]);
      pages.push(result.rows);
    }
    assert.deepEqual(pages.map((rows) => rows.length), [20, 20, 2]);
    const rows = pages.flat();
    assert.equal(new Set(rows.map((row) => row.id)).size, 42);
    assert.equal(rows[0].action, 'action_42');
    assert.equal(rows.at(-1).action, 'action_1');
    assert.equal(rows[0].firstName, 'Alice');
    assert.ok(!rows.some((row) => row.action === 'later'));
  } finally { await db.close(); }
});
