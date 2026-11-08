import test from 'node:test';
import assert from 'node:assert/strict';
import { rhNotificationMessage } from '../apps/redaction/src/lib/redaction/rh/notifications.ts';
test('messages de notification distincts et sans montant', () => {
  const remuneration = rhNotificationMessage('remuneration');
  const retrait = rhNotificationMessage('retrait');
  assert.notEqual(remuneration, retrait);
  assert.match(remuneration, /rémunération/i);
  assert.match(retrait, /retrait/i);
  assert.doesNotMatch(remuneration, /CDF|USD|\d/i);
  assert.match(rhNotificationMessage('absence'), /demande/);
  assert.match(rhNotificationMessage('prestation'), /déclaration/);
});
import { managementEventTypes, managementEventLabel } from '../apps/redaction/src/lib/redaction/rh/management-notifications.ts';
import { capabilitiesForRoles } from '../apps/redaction/src/lib/redaction/rh/permissions.ts';
test('alertes gestion : droits et indicateurs isolent les types', () => {
  assert.deepEqual(managementEventTypes(capabilitiesForRoles(false,[]),true,true), []);
  assert.deepEqual(managementEventTypes(capabilitiesForRoles(false,['rh_manager']),true,true), ['prestation','absence']);
  assert.deepEqual(managementEventTypes(capabilitiesForRoles(false,['finance_manager']),true,true), ['retrait']);
  assert.deepEqual(managementEventTypes(capabilitiesForRoles(false,['finance_manager']),false,true), []);
  assert.deepEqual(managementEventTypes(capabilitiesForRoles(true,[]),true,true), ['prestation','absence','retrait','contestation']);
  assert.deepEqual(managementEventTypes(capabilitiesForRoles(true,[]),false,false), ['prestation','absence']);
  for (const message of Object.values(managementEventLabel)) assert.doesNotMatch(message,/CDF|USD|\d|motif/i);
});
