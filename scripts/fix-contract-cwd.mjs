import fs from 'node:fs';
const file = 'tests/rh-contract-workflow.test.mjs';
let text = fs.readFileSync(file, 'utf8');
text = text.replace("cwd:new URL('../',import.meta.url).pathname", 'cwd:process.cwd()');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('cwd:process.cwd()') ? 'OK' : 'MISS');
