import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
const outsider = '00000000-0000-4000-8000-000000000003';
const privateRoom = '10000000-0000-4000-8000-000000000001';
const otherRoom = '10000000-0000-4000-8000-000000000002';
const groupRoom = '10000000-0000-4000-8000-000000000003';

test('badge Chat RH : compte seulement les messages non lus et accessibles, sans ses propres messages', async () => {
  const route = await read('apps/redaction/src/app/api/redaction/rh/mon-espace/chat/non-lus/route.ts');
  const sql = route.match(/db\(\)\.query\(`([\s\S]*?)`, \[person\.id\]\)/)?.[1];
  assert.ok(sql);
  assert.match(route, /await requireRhPrincipal\(\)/);
  assert.match(route, /await getMyCollaborator\(principal\)/);
  assert.match(route, /!\(await getRhFlags\(\)\)\.chatEnabled/);
  assert.match(route, /receiptsReady: false/);
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA redaction_rh;
      CREATE TABLE redaction_rh.chat_rooms(id uuid PRIMARY KEY, kind text);
      CREATE TABLE redaction_rh.chat_room_members(room_id uuid,collaborator_id uuid);
      CREATE TABLE redaction_rh.chat_messages(id uuid PRIMARY KEY,room_id uuid,sender_id uuid,created_at timestamptz);
      CREATE TABLE redaction_rh.chat_room_reads(room_id uuid,collaborator_id uuid,read_at timestamptz);`);
    await db.query("INSERT INTO redaction_rh.chat_rooms(id,kind) VALUES ($1,'private'),($2,'private')", [privateRoom,otherRoom]);
    await db.query('INSERT INTO redaction_rh.chat_room_members(room_id,collaborator_id) VALUES ($1,$2),($1,$3),($4,$5)', [privateRoom,a,b,otherRoom,outsider]);
    for (const [id,room,sender,created] of [
      ['20000000-0000-4000-8000-000000000001',privateRoom,b,'2026-01-01T08:00:00Z'],
      ['20000000-0000-4000-8000-000000000002',privateRoom,b,'2026-01-01T09:00:00Z'],
      ['20000000-0000-4000-8000-000000000003',privateRoom,a,'2026-01-01T10:00:00Z'],
      ['20000000-0000-4000-8000-000000000004',otherRoom,outsider,'2026-01-01T11:00:00Z'],
    ]) await db.query('INSERT INTO redaction_rh.chat_messages(id,room_id,sender_id,created_at) VALUES($1,$2,$3,$4)',[id,room,sender,created]);
    assert.equal((await db.query(sql,[a])).rows[0].count,2);
    await db.query("INSERT INTO redaction_rh.chat_room_reads(room_id,collaborator_id,read_at) VALUES($1,$2,'2026-01-01T08:00:00Z')",[privateRoom,a]);
    assert.equal((await db.query(sql,[a])).rows[0].count,1);
    await db.query("UPDATE redaction_rh.chat_room_reads SET read_at='2026-01-01T10:00:00Z' WHERE collaborator_id=$1",[a]);
    assert.equal((await db.query(sql,[a])).rows[0].count,0);
    await db.query("INSERT INTO redaction_rh.chat_rooms(id,kind) VALUES ($1,'group')",[groupRoom]);
    await db.query("INSERT INTO redaction_rh.chat_messages(id,room_id,sender_id,created_at) VALUES($1,$2,$3,'2026-01-01T12:00:00Z')",['20000000-0000-4000-8000-000000000005',groupRoom,b]);
    assert.equal((await db.query(sql,[a])).rows[0].count,1);
  } finally { await db.close(); }
});

test('Push : messages et fichiers après COMMIT, bascule RH envoyée seulement si état changé', async () => {
  const [chat,files,push,settings,fab,shell] = await Promise.all([
    read('apps/redaction/src/app/api/redaction/rh/mon-espace/chat/route.ts'),
    read('apps/redaction/src/app/api/redaction/rh/mon-espace/chat/fichiers/route.ts'),
    read('apps/redaction/src/lib/redaction/rh/chat-push.ts'),
    read('apps/redaction/src/app/api/redaction/rh/parametres/route.ts'),
    read('apps/redaction/src/components/redaction/rh/rh-chat-fab.tsx'),
    read('apps/redaction/src/components/redaction/redaction-shell.tsx'),
  ]);
  assert.match(chat, /await client\.query\('COMMIT'\);release\(\);const messageId=.*?await pushRhChatMessage\(pushEmails\)/s);
  assert.match(files, /await client\.query\('COMMIT'\);release\(\);await pushRhChatMessage\(recipients\.rows\.map/);
  assert.match(push, /await notifyEditorsByEmail\(emails/);
  assert.match(settings, /if \(\(previous\.get\(name\) \?\? defaults\[name\]\) !== value\) changed\.push/);
  assert.match(settings, /await client\.query\('COMMIT'\);[\s\S]*if \(changed\.length\)/);
  assert.match(settings, /WHERE NOT c\.archived/);
  assert.match(settings, /await notifyEditorsByEmail\(emails/);
  assert.match(fab, /aria-label=\{count \? `Chat RH/);
  assert.match(shell, /\(inRh \|\| inMyRh\) && !inChat && <RhChatFab/);
  assert.match(shell, /!rhOnly && !inRh && !inMyRh && <Link/);
  const [release, releaseApi] = await Promise.all([
    read('apps/redaction/src/lib/redaction/rh/releases.json'),
    read('apps/redaction/src/app/api/redaction/rh/releases/route.ts'),
  ]);
  assert.match(release, /rh-2026-11-chat-alertes/);
  assert.match(releaseApi, /!item\.requiresChat \|\| flags\.chatEnabled/);
});
