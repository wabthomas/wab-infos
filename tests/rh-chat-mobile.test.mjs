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
  assert.match(chat, /aria-label="Changer de conversation"/);
  assert.match(chat, /aria-label="Nouvelle discussion privée"/);
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
