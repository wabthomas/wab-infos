import fs from 'node:fs';
const lines = fs.readFileSync('apps/redaction/src/components/redaction/rh/attendance-review.tsx','utf8').split(/\r?\n/);
for (const i of [205,206,207,211,212,213,214,215,216,217,218,219,220,225,226,227,228,229,230]) console.log(i+1, JSON.stringify(lines[i]));
