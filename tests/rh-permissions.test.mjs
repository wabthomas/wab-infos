import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilitiesForRoles, allowsRhPermission, isRhRole } from '../apps/redaction/src/lib/redaction/rh/permissions.ts';
test('droits RH distincts, refus par défaut et cumul explicite', () => {
  const empty = capabilitiesForRoles(false, []);
  for (const p of ['team_read','hr_manage','finance_manage','access_manage']) assert.equal(allowsRhPermission(empty,p), false);
  const rh = capabilitiesForRoles(false, ['rh_manager']);
  assert.equal(allowsRhPermission(rh,'team_read'), true); assert.equal(allowsRhPermission(rh,'hr_manage'), true); assert.equal(allowsRhPermission(rh,'finance_manage'), false); assert.equal(allowsRhPermission(rh,'access_manage'), false);
  const finance = capabilitiesForRoles(false, ['finance_manager']);
  assert.equal(allowsRhPermission(finance,'team_read'), true); assert.equal(allowsRhPermission(finance,'finance_manage'), true); assert.equal(allowsRhPermission(finance,'hr_manage'), false); assert.equal(allowsRhPermission(finance,'access_manage'), false);
  const combined = capabilitiesForRoles(false, ['rh_manager','finance_manager']);
  assert.equal(allowsRhPermission(combined,'hr_manage'), true); assert.equal(allowsRhPermission(combined,'finance_manage'), true); assert.equal(allowsRhPermission(combined,'access_manage'), false);
  for (const p of ['team_read','hr_manage','finance_manage','access_manage']) assert.equal(allowsRhPermission(capabilitiesForRoles(true, []),p), true);
  assert.equal(isRhRole('admin'), false); assert.equal(isRhRole('rh_manager'), true);
});
