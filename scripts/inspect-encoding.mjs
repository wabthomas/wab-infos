import fs from 'node:fs';
function show(file, needle) {
  const text = fs.readFileSync(file, 'utf8');
  const index = text.indexOf(needle);
  console.log(file, index >= 0 ? JSON.stringify(text.slice(index, index + 120)) : 'NOT_FOUND');
}
show('apps/redaction/src/app/layout.tsx', 'title:');
show('apps/redaction/src/app/(editor)/rh/parametres/page.tsx', 'Administration RH');
show('apps/redaction/public/sw-redaction.js', 'const OFFLINE_HTML');
