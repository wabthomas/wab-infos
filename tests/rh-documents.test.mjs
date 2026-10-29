import test from 'node:test';
import assert from 'node:assert/strict';
import { documentFileType, isDocumentCategory, validateDocumentTitle, MAX_RH_DOCUMENT_BYTES } from '../apps/redaction/src/lib/redaction/rh/documents.ts';
test('documents : titres et catégories autorisés', () => {
  assert.equal(validateDocumentTitle('  Contrat  '), 'Contrat');
  for (const title of ['', '  ', 'texte\nsecret', 'x'.repeat(121), null]) assert.equal(validateDocumentTitle(title), null);
  assert.equal(isDocumentCategory('contrat'), true); assert.equal(isDocumentCategory('sante'), false);
});
test('signatures et limite de taille', () => {
  assert.equal(documentFileType(new Uint8Array([0x25,0x50,0x44,0x46,0x2d])), 'pdf');
  assert.equal(documentFileType(new Uint8Array([0xff,0xd8,0xff])), 'jpeg');
  assert.equal(documentFileType(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), 'png');
  assert.equal(documentFileType(new TextEncoder().encode('<svg onload=alert(1)>')), null);
  assert.equal(documentFileType(new Uint8Array(MAX_RH_DOCUMENT_BYTES + 1)), null);
});
