import fs from 'node:fs';
const file = 'apps/redaction-desktop/package.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
data.build.electronVersion = '37.10.3';
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('electronVersion', data.build.electronVersion);
