import fs from 'node:fs';
const file = 'apps/reader-android/android/app/build.gradle';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.trim().startsWith('redaction {'));
const code = lines.findIndex((line, i) => i > start && line.trim() === 'versionCode 18');
const name = lines.findIndex((line, i) => i > start && line.includes('1.0.17'));
if (code < 0 || name < 0) { console.log('MISS', start, code, name); process.exit(1); }
lines[code] = lines[code].replace('versionCode 18', 'versionCode 19');
lines[name] = lines[name].replace('"1.0.17"', '"1.0.18"');
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(lines[code].trim(), lines[name].trim());
