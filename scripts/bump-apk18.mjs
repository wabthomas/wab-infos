import fs from 'node:fs';
const file = 'apps/reader-android/android/app/build.gradle';
let text = fs.readFileSync(file, 'utf8');
text = text.replace('versionCode 17', 'versionCode 18').replace('versionName "1.0.16"', 'versionName "1.0.17"');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('versionCode 18') ? 'OK' : 'MISS');
