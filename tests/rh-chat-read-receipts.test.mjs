import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const route = await readFile(new URL('../apps/redaction/src/app/api/redaction/rh/mon-espace/chat/route.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../docs/sql/rh-chat-read-receipts.sql', import.meta.url), 'utf8');
const sender = '00000000-0000-4000-8000-000000000001';
const recipient = '00000000-0000-4000-8000-000000000002';
const third = '00000000-0000-4000-8000-000000000003';
const privateRoom = '10000000-0000-4000-8000-000000000001';
const groupRoom = '10000000-0000-4000-8000-000000000002';
const first = '20000000-0000-4000-8000-000000000001';
const second = '20000000-0000-4000-8000-000000000002';

test('accusés RH : seule la lecture réelle de chaque destinataire déclenche deux coches, groupe compris', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA redaction_rh;
      CREATE TABLE redaction_rh.collaborators(id uuid PRIMARY KEY, archived boolean DEFAULT false);
      CREATE TABLE redaction_rh.account_links(collaborator_id uuid);
      CREATE TABLE redaction_rh.chat_rooms(id uuid PRIMARY KEY,kind text);
      CREATE TABLE redaction_rh.chat_room_members(room_id uuid,collaborator_id uuid);
      CREATE TABLE redaction_rh.chat_messages(id uuid PRIMARY KEY,room_id uuid,sender_id uuid,created_at timestamptz);`);
    await db.exec(migration);
    await db.query('INSERT INTO redaction_rh.collaborators(id) VALUES ($1),($2),($3)', [sender, recipient, third]);
    await db.query('INSERT INTO redaction_rh.account_links(collaborator_id) VALUES ($1),($2),($3)', [sender, recipient, third]);
    await db.query("INSERT INTO redaction_rh.chat_rooms(id,kind) VALUES ($1,'private'),($2,'group')", [privateRoom, groupRoom]);
    await db.query('INSERT INTO redaction_rh.chat_room_members(room_id,collaborator_id) VALUES ($1,$2),($1,$3)', [privateRoom, sender, recipient]);
    await db.query("INSERT INTO redaction_rh.chat_messages(id,room_id,sender_id,created_at) VALUES ($1,$2,$3,'2026-01-01T09:00:00Z'),($4,$5,$3,'2026-01-01T09:00:00Z')", [first, privateRoom, sender, second, groupRoom]);
    const readSql = route.match(/const readSql=receiptsReady \? `([\s\S]*?)` : 'false AS "read"'/)?.[1];
    assert.ok(readSql, 'SQL de lecture disponible');
    const check = async (id) => (await db.query(`SELECT ${readSql} FROM redaction_rh.chat_messages m WHERE m.id=$1`, [id, sender])).rows[0].read;
    assert.equal(await check(first), false);
    assert.equal(await check(second), false);
    const mark = async (room, message, person) => db.query(`INSERT INTO redaction_rh.chat_room_reads(room_id,collaborator_id,read_at)
      SELECT m.room_id,$2,m.created_at FROM redaction_rh.chat_messages m WHERE m.id=$3 AND m.room_id=$1
      ON CONFLICT(room_id,collaborator_id) DO UPDATE SET read_at=GREATEST(redaction_rh.chat_room_reads.read_at,EXCLUDED.read_at)`, [room, person, message]);
    await mark(privateRoom, first, recipient);
    assert.equal(await check(first), true);
    await mark(groupRoom, second, recipient);
    assert.equal(await check(second), false, 'le groupe attend tous les destinataires');
    await mark(groupRoom, second, third);
    assert.equal(await check(second), true);
  } finally { await db.close(); }
});
