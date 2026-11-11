import fs from 'node:fs';
const file = 'apps/reader-android/android/app/build.gradle';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/(redaction \{[\s\S]*?versionCode )18( \r?\n\s*versionName )"1\.0\.17"/, '$119$2"1.0.18"');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('versionCode 19') && text.includes('"1.0.18"') ? 'OK' : 'MISS');
