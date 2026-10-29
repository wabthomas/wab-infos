import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
// À utiliser seulement avec les fixtures isolées des tests PostgreSQL et Strapi simulé.
const base = process.env.RH_TEST_HTTP_URL;
test('HTTP RH : authentification, périmètres, origine et retraits', { skip: !base && 'Définir RH_TEST_HTTP_URL pour le serveur de test isolé' }, async () => {
  const url = new URL(base);
  assert.ok(['127.0.0.1','localhost','::1','[::1]'].includes(url.hostname));
  assert.equal(url.protocol, 'http:');
  const origin = url.origin;
  const send = async (path, token, method='GET', body, source=origin) => {
    const headers = {};
    if (token) headers.cookie = `redaction_jwt=${token}`;
    if (method !== 'GET') { headers.origin = source; headers['content-type'] = 'application/json'; }
    const r = await fetch(`${origin}/api/redaction/rh/${path}`, { method, headers, body:body === undefined ? undefined : JSON.stringify(body), redirect:'manual' });
    return { status:r.status, data:await r.json(), cache:r.headers.get('cache-control') };
  };
  assert.equal((await send('mon-espace',null)).status,401);
  const me = await send('mon-espace','alice'); assert.equal(me.status,200); const person = me.data.person.id;
  assert.equal((await send(`retraits?collaboratorId=${person}`,'alice')).status,403);
  assert.equal((await send(`documents?collaboratorId=${person}`,'bob')).status,403);
  assert.equal((await send('droits','bob')).status,403);
  assert.equal((await send(`retraits?collaboratorId=${person}`,'bob')).status,200);
  assert.equal((await send(`retraits?collaboratorId=${person}`,'admin')).status,200);
  const self = await send('mon-espace/retraits','alice');
  assert.equal(self.status,200); assert.equal(self.data.balances.find((b) => b.currency === 'CDF').available,'8000');
  assert.match(self.cache,/no-store/);
  const other = await send('mon-espace/retraits','bob');
  assert.equal(other.data.balances.find((b) => b.currency === 'CDF').available,null);
  const key = randomUUID(); const input = { key,currency:'CDF',amount:'70',method:'especes' };
  assert.equal((await send('mon-espace/retraits','alice','POST',input,'http://evil.example')).status,403);
  assert.equal((await send('mon-espace/retraits','alice','POST',{...input,amount:'81'})).status,409);
  const created = await send('mon-espace/retraits','alice','POST',input); assert.equal(created.status,201);
  const id = created.data.withdrawal.id;
  const retry = await send('mon-espace/retraits','alice','POST',input); assert.equal(retry.status,201); assert.equal(retry.data.withdrawal.id,id);
  assert.equal((await send('mon-espace/retraits','alice','POST',{...input,amount:'1'})).status,409);
  assert.equal((await send('mon-espace/retraits','bob','PATCH',{action:'cancel',id,version:1})).status,409);
  assert.equal((await send('retraits','alice','PATCH',{action:'approve',id,version:1,note:''})).status,403);
  assert.equal((await send('mon-espace/retraits','alice','PATCH',{action:'cancel',id,version:1})).status,200);
  assert.equal((await send('mon-espace/retraits','alice','PATCH',{action:'cancel',id,version:1})).status,409);
  assert.equal((await send('mon-espace/retraits','alice')).data.balances.find((b) => b.currency === 'CDF').available,'8000');
  assert.equal((await send('mon-espace/ajustements','bob')).data.adjustments.length,0);
  const bobPerson = (await send('mon-espace','bob')).data.person.id;
  const grant = { collaboratorId:bobPerson, role:'finance_manager' };
  assert.equal((await send('droits','admin','POST',{...grant,action:'revoke'})).status,200);
  try { assert.equal((await send(`retraits?collaboratorId=${person}`,'bob')).status,403); }
  finally { assert.equal((await send('droits','admin','POST',{...grant,action:'grant'})).status,200); }
  assert.equal((await send(`retraits?collaboratorId=${person}`,'bob')).status,200);
  const form = new FormData(); form.set('collaboratorId',person); form.set('title','Fixture test'); form.set('category','autre'); form.set('share','yes'); form.set('file',new File(['%PDF-test'], 'test.pdf', { type:'application/pdf' }));
  const upload = await fetch(`${origin}/api/redaction/rh/documents`, { method:'POST', headers:{cookie:'redaction_jwt=admin',origin},body:form });
  assert.equal(upload.status,201); const document = (await upload.json()).document;
  const download = (token) => fetch(`${origin}/api/redaction/rh/mon-espace/documents/${document.id}`, { headers:{cookie:`redaction_jwt=${token}`} });
  assert.equal((await download('bob')).status,404);
  const own = await download('alice'); assert.equal(own.status,200); assert.match(own.headers.get('cache-control'),/no-store/); assert.equal(await own.text(),'%PDF-test');
  assert.equal((await send('documents','admin','PATCH',{id:document.id,version:document.version,action:'archive'})).status,200);
  assert.equal((await download('alice')).status,404);
});
