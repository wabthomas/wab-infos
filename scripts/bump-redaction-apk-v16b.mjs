import fs from 'node:fs';
const file = 'apps/reader-android/android/app/build.gradle';
let text = fs.readFileSync(file, 'utf8');
text = text.replace('versionCode 15', 'versionCode 16').replace('versionName "1.0.14"', 'versionName "1.0.15"');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('versionCode 16') && text.includes('1.0.15') ? 'OK' : 'MISS');
