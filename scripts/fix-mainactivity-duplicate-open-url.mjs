import fs from 'node:fs';
const file = 'apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const bridge = lines.findIndex(line => line.includes('private class NativeBridge'));
const first = lines.findIndex((line, i) => i > bridge && line.includes('public void openExternalUrl'));
if (first < 0) { console.log('MISS'); process.exit(1); }
let start = first;
while (start > bridge && !lines[start].includes('JavascriptInterface')) start -= 1;
let end = first;
while (end < lines.length && lines[end].trim() !== '});') end += 1;
lines.splice(start, end - start + 1);
fs.writeFileSync(file, lines.join(eol), 'utf8');
const count = (fs.readFileSync(file, 'utf8').match(/public void openExternalUrl/g) || []).length;
console.log('openExternalUrl_count=' + count);
