import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/employee-id-card.tsx';
let text = fs.readFileSync(file, 'utf8');
const button = `      {adminPersonId && <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAdminPhoto} className="sr-only" />Photo du collaborateur</label>}\n`;
text = text.replace(/(      <button type="button" onClick=\{printIdentityCard\})/, button + '$1');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('>=Photo du collaborateur</label>') ? 'BUTTON_OK' : 'BUTTON_MISSING');
