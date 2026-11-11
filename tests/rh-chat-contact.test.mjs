import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const read = path => readFile(new URL(`../apps/redaction/src/${path}`, import.meta.url), 'utf8');
const sender = '00000000-0000-4000-8000-000000000001';
const peer = '00000000-0000-4000-8000-000000000002';
const outsider = '00000000-0000-4000-8000-000000000003';
const privateId = '10000000-0000-4000-8000-000000000001';
const groupId = '10000000-0000-4000-8000-000000000002';

test('fiche contact : SQL privé limité au membre de la conversation, sans exposition des autres dossiers', async () => {
  const source = await read('app/api/redaction/rh/mon-espace/chat/rooms/[id]/contact/route.ts');
  const sql = source.match(/db\(\)\.query\(`([\s\S]*?)`, \[id, person\.id\]\)/)?.[1];
  assert.ok(sql);
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA redaction_rh;
      CREATE TABLE redaction_rh.chat_rooms(id uuid PRIMARY KEY,kind text);
      CREATE TABLE redaction_rh.chat_room_members(room_id uuid,collaborator_id uuid);
      CREATE TABLE redaction_rh.collaborators(id uuid PRIMARY KEY, first_name text,last_name text,archived boolean DEFAULT false);
      CREATE TABLE redaction_rh.employee_profiles(collaborator_id uuid,phone text,work_email text);`);
    await db.query("INSERT INTO redaction_rh.collaborators(id,first_name,last_name) VALUES ($1,'Alice','A'),($2,'Bob','B'),($3,'Eve','C')", [sender, peer, outsider]);
    await db.query("INSERT INTO redaction_rh.chat_rooms(id,kind) VALUES ($1,'private'),($2,'group')", [privateId, groupId]);
    await db.query('INSERT INTO redaction_rh.chat_room_members(room_id,collaborator_id) VALUES ($1,$2),($1,$3)', [privateId, sender, peer]);
    await db.query("INSERT INTO redaction_rh.employee_profiles(collaborator_id,phone,work_email) VALUES ($1,'+243123','bob@example.org')", [peer]);
    assert.deepEqual((await db.query(sql, [privateId, sender])).rows.map(r => ({ phone: r.phone, email: r.email })), [{ phone: '+243123', email: 'bob@example.org' }]);
    assert.equal((await db.query(sql, [privateId, outsider])).rowCount, 0);
    assert.equal((await db.query(sql, [groupId, sender])).rowCount, 0);
    assert.equal((await db.query(sql, [privateId, peer])).rows[0].firstName, 'Alice');
  } finally { await db.close(); }
});

test('contact cliquable, menu trois points, recherche de messages et thème propre à la discussion', async () => {
  const chat = await read('components/redaction/rh/chat.tsx');
  assert.match(chat, /active\?\.kind === 'private' \? <button type="button" onClick=\{\(\) => void openContact\(\)\}/);
  assert.match(chat, /aria-label="Options de la discussion"/);
  assert.match(chat, /Afficher le contact<\/button>/);
  assert.match(chat, /Rechercher<\/button>/);
  assert.match(chat, /Thème de la discussion<\/button>/);
  assert.match(chat, /aria-label="Rechercher dans la discussion"/);
  assert.match(chat, /messages\.filter\(message =>/);
  assert.match(chat, /rh-chat-theme:\$\{room\}/);
  assert.match(chat, /aria-label="Informations du contact"/);
  assert.match(chat, /<RoomAvatar room=\{active\} size="h-24 w-24"/);
  assert.match(chat, /contactInfo\.phone\?\.trim\(\)/);
  assert.match(chat, /contactInfo\.email\?\.trim\(\)/);
});
