import fs from 'node:fs';
const file = 'apps/redaction/src/app/api/redaction/rh/contrats/route.ts';
let text = fs.readFileSync(file, 'utf8');
const before = text;
text = text.replace('birth_place,signature_place,signature_date,prepared_by)', 'birth_place,signature_place,signature_date,display_options,prepared_by)');
text = text.replace('SELECT $1,id,$3,$4,$5,$6,$7,$8,$9,$10,$12,$13,$14,$11 FROM', 'SELECT $1,id,$3,$4,$5,$6,$7,$8,$9,$10,$12,$13,$14,$15,$11 FROM');
fs.writeFileSync(file, text, 'utf8');
console.log(text === before ? 'MISS' : 'FIXED');
