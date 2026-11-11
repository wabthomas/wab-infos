import fs from 'node:fs';
for (const [name,file] of [['SUB','apps/redaction/src/components/redaction/rh/my-submissions.tsx'],['WIT','apps/redaction/src/components/redaction/rh/my-withdrawals.tsx']]) {
  const lines = fs.readFileSync(file,'utf8').split(/\r?\n/);
  console.log('==='+name);
  lines.forEach((l,i)=>{ if (l.includes('nativeInsetRef')||l.includes('keyboardInset')||l.includes('const resize')||l.includes('const base =')||l.includes('\[\]))')) console.log(i+1, JSON.stringify(l)); });
}
