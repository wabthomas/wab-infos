import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { randomBytes, createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('liens navigateur RH : schéma privé, contenu PDF et expiration', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE SCHEMA redaction_rh');
    await db.exec(await readFile(new URL('../docs/sql/rh-browser-documents.sql',import.meta.url),'utf8'));
    const token=randomBytes(32).toString('hex');
    const hash=createHash('sha256').update(token).digest('hex');
    const content=Buffer.from('%PDF-1.4\n1 0 obj\nendobj\n%%EOF');
    await db.query(`INSERT INTO redaction_rh.browser_documents(token_hash,owner_email,mime_type,file_name,file_bytes,expires_at) VALUES($1,$2,'application/pdf','contrat.pdf',$3,now()+interval '10 minutes')`,[hash,'test@example.test',content]);
    const found=await db.query('SELECT file_bytes FROM redaction_rh.browser_documents WHERE token_hash=$1 AND expires_at>now()',[hash]);
    assert.deepEqual(Buffer.from(found.rows[0].file_bytes),content);
    assert.equal((await db.query('SELECT 1 FROM redaction_rh.browser_documents WHERE token_hash=$1',[token])).rowCount,0);
    await assert.rejects(db.query(`INSERT INTO redaction_rh.browser_documents(token_hash,owner_email,mime_type,file_name,file_bytes,expires_at) VALUES($1,'test@example.test','text/html','test.html',$2,now())`,['a'.repeat(64),content]));
    await db.query(`INSERT INTO redaction_rh.browser_documents(token_hash,owner_email,mime_type,file_name,file_bytes,expires_at) VALUES($1,'test@example.test','text/csv','rapport.csv',$2,now()+interval '10 minutes')`,['b'.repeat(64),Buffer.from('Nom;Statut\nExemple;Actif')]);
    await db.query("UPDATE redaction_rh.browser_documents SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[hash]);
    assert.equal((await db.query('SELECT 1 FROM redaction_rh.browser_documents WHERE token_hash=$1 AND expires_at>now()',[hash])).rowCount,0);
  } finally { await db.close(); }
});
