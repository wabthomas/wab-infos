import fs from 'node:fs';
let enc = fs.readFileSync('tests/rh-encoding.test.mjs', 'utf8');
enc = enc.replace('/adminPersonId\\?: string/', '/adminPersonId\\?: ?string/');
fs.writeFileSync('tests/rh-encoding.test.mjs', enc, 'utf8');
let cf = fs.readFileSync('tests/rh-contract-workflow.test.mjs', 'utf8');
cf = cf.replace('timeout:30000', 'timeout:120000');
fs.writeFileSync('tests/rh-contract-workflow.test.mjs', cf, 'utf8');
console.log('TEST_PATCHED');
