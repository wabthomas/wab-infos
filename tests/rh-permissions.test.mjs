import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilitiesForRoles, allowsRhPermission, isRhRole } from '../apps/redaction/src/lib/redaction/rh/permissions.ts';
import { isRhOnlyJobTitle } from '../apps/redaction/src/lib/redaction/rh/collaborator.ts';
test('les fonctions techniques listées sont réservées à l’espace RH', () => {
  for (const title of ['Réalisateur','Assistant réalisateur','Cadreur','Monteur','Ingénieur du son','Présentateur','Animateur','Photographe','Technicien']) assert.equal(isRhOnlyJobTitle(title), true);
  assert.equal(isRhOnlyJobTitle('ingenieur du son'), true);
  assert.equal(isRhOnlyJobTitle('Journaliste'), false);
  assert.equal(isRhOnlyJobTitle('Rédacteur en chef'), false);
});
test('droits RH distincts, refus par défaut et cumul explicite', () => {
  const empty = capabilitiesForRoles(false, []);
  for (const p of ['team_read','hr_manage','finance_read','finance_manage','access_manage']) assert.equal(allowsRhPermission(empty,p), false);
  const rh = capabilitiesForRoles(false, ['rh_manager']);
  assert.equal(allowsRhPermission(rh,'team_read'), true); assert.equal(allowsRhPermission(rh,'hr_manage'), true); assert.equal(allowsRhPermission(rh,'finance_manage'), false); assert.equal(allowsRhPermission(rh,'access_manage'), false);
  const finance = capabilitiesForRoles(false, ['finance_manager']);
  assert.equal(allowsRhPermission(finance,'team_read'), true); assert.equal(allowsRhPermission(finance,'finance_manage'), true); assert.equal(allowsRhPermission(finance,'hr_manage'), false); assert.equal(allowsRhPermission(finance,'access_manage'), false);
  const rhViewer = capabilitiesForRoles(false, ['rh_viewer']);
  assert.equal(allowsRhPermission(rhViewer,'team_read'), true); assert.equal(allowsRhPermission(rhViewer,'hr_manage'), false);
  const financeViewer = capabilitiesForRoles(false, ['finance_viewer']);
  assert.equal(allowsRhPermission(financeViewer,'team_read'), true); assert.equal(allowsRhPermission(financeViewer,'finance_read'), true); assert.equal(allowsRhPermission(financeViewer,'finance_manage'), false);
  const combined = capabilitiesForRoles(false, ['rh_manager','finance_manager']);
  assert.equal(allowsRhPermission(combined,'hr_manage'), true); assert.equal(allowsRhPermission(combined,'finance_manage'), true); assert.equal(allowsRhPermission(combined,'access_manage'), false);
  for (const p of ['team_read','hr_manage','finance_read','finance_manage','access_manage']) assert.equal(allowsRhPermission(capabilitiesForRoles(true, []),p), true);
  assert.equal(isRhRole('admin'), false); assert.equal(isRhRole('rh_manager'), true);
});
