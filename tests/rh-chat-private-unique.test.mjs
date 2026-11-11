import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('création de conversation privée idempotente par paire', () => {
  const route = read('../apps/redaction/src/app/api/redaction/rh/mon-espace/chat/route.ts');
  assert.match(route, /privateKey=\[person\.id,d\.collaboratorId\]\.sort\(\)\.join\(':'\)/);
  assert.match(route, /ON CONFLICT \(private_key\)/);
});

test('la liste du chat déduplique les conversations privées par contact', () => {
  const chat = read('../apps/redaction/src/components/redaction/rh/chat.tsx');
  assert.match(chat, /uniquePrivate/);
  assert.match(chat, /new Map\(rooms\.filter/);
  assert.match(chat, /const conversations = uniquePrivate/);
});

test('migration de fusion des doublons et index unique', () => {
  const sql = read('../docs/sql/rh-chat-private-unique.sql');
  assert.match(sql, /chat_room_dups/);
  assert.match(sql, /UPDATE redaction_rh\.chat_messages/);
  assert.match(sql, /chat_rooms_private_key_idx/);
});
