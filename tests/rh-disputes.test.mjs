import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDispute, disputeText } from '../apps/redaction/src/lib/redaction/rh/disputes.ts';
const key='01234567-89ab-cdef-0123-456789abcdef';
test('contestations : champs et taille bornés', () => {
  assert.deepEqual(validateDispute({key,category:'prestation',message:'  Merci de vérifier  '}),{key,category:'prestation',message:'Merci de vérifier'});
  for (const value of [null,{}, {key,category:'bad',message:'x'}, {key:'x',category:'autre',message:'x'}, {key,category:'autre',message:' '}, {key,category:'autre',message:'x\u0000'}, {key,category:'autre',message:'x'.repeat(1001)}]) assert.equal(validateDispute(value),null);
  assert.equal(disputeText('   ok  '),'ok'); assert.equal(disputeText(''),null);
});
