import fs from 'node:fs';
const file = 'tests/rh-audit-pagination.test.mjs';
let text = fs.readFileSync(file, 'utf8');
text = text.replace("assert.match(route, /requireRhPermission\\('access_manage'\\)/);", "assert.match(route, /requireRhPermission\\('hr_manage'\\)/);");
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes("requireRhPermission\\('hr_manage'\\)/") ? 'OK' : 'MISS');
