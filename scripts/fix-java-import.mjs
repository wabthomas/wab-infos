import fs from 'node:fs';
const file = 'apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/^import android\.app\.PrintDocumentAdapter;\r?\n/m, '');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('import android.app.PrintDocumentAdapter;') ? 'STILL' : 'REMOVED');
