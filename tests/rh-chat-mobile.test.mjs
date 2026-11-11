import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../apps/redaction/src/components/redaction/${path}`, import.meta.url), 'utf8');

test('Chat RH : composition multiligne auto-agrandissante et envoi conservé', async () => {
  const chat = await read('rh/chat.tsx');
  assert.match(chat, /<textarea ref=\{input\} rows=\{1\}/);
  assert.match(chat, /field\.style\.height = 'auto'/);
  assert.match(chat, /Math\.min\(field\.scrollHeight, 144\)/);
  assert.match(chat, /max-h-36.*resize-none.*overflow-y-auto/);
  assert.match(chat, /event\.key === 'Enter' && !event\.shiftKey/);
  assert.match(chat, /requestSubmit\(\)/);
  assert.match(chat, /action: 'message', roomId: room, body, replyTo: reply\?\.id/);
  assert.match(chat, /<form ref=\{composer\} onSubmit=\{send\}/);
});

test('Chat RH : affichage mobile des conversations, pièces jointes et vocal', async () => {
  const chat = await read('rh/chat.tsx');
  assert.match(chat, /mobileView === 'list'/);
  assert.match(chat, /aria-label="Retour aux discussions"/);
  assert.match(chat, /aria-label="Nouvelle discussion privée"/);
  assert.match(chat, /<RoomAvatar room=\{active\}/);
  assert.match(chat, /onChange=\{chooseFile\}/);
  assert.match(chat, /recordVoice\(\)/);
  assert.match(chat, /visual\?\.addEventListener\('resize', resize\)/);
});

test('Actions flottantes : masquées uniquement sur Chat RH mobile', async () => {
  const shell = await read('redaction-shell.tsx');
  assert.match(shell, /pathname === '\/mon-rh\/chat' \? 'hidden' : 'flex'/);
  assert.match(shell, /pathname === '\/mon-rh\/chat' \? 'hidden' : ''/);
  assert.match(shell, /right-4 z-50 h-14 w-14[^\n]*lg:hidden/);
  assert.match(shell, /right-5 h-12 w-12 lg:hidden/);
  assert.match(shell, /right-6 hidden h-14 w-14 lg:flex/);
});

test('Chat mobile plein écran : topbar retour, sans titre RH, onglets ni barre basse', async () => {
  const [shell, section, api, photo] = await Promise.all([
    read('redaction-shell.tsx'), read('rh/rh-section-shell.tsx'),
    readFile(new URL('../apps/redaction/src/app/api/redaction/rh/mon-espace/chat/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../apps/redaction/src/app/api/redaction/rh/mon-espace/chat/photos/[id]/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(shell, /href="\/mon-rh" aria-label="Retour à mon espace RH"/);
  assert.match(shell, /<span className="truncate font-display text-lg font-bold">Chat RH<\/span>/);
  assert.match(shell, /inChat \? null : inMyRh/);
  assert.match(shell, /inChat \? 'hidden' : ''\} redaction-mobile-nav/);
  assert.match(section, /pathname === '\/mon-rh\/chat'\) \? 'hidden lg:block'/);
  assert.match(section, /pathname === '\/mon-rh\/chat'\) \? 'hidden lg:block' : ''/);
  assert.match(api, /AS "photoId"/);
  assert.match(photo, /JOIN redaction_rh\.chat_room_members me/);
});
