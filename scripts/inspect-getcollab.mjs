import fs from 'node:fs';
const lines = fs.readFileSync('apps/redaction/src/lib/redaction/rh/database.ts','utf8').split(/\r?\n/);
const start = lines.findIndex(l => l.includes('export async function getMyCollaborator'));
for (let i=start;i<start+6;i++) console.log(i+1, JSON.stringify(lines[i]));
