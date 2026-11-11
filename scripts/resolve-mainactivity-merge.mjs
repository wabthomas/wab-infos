import fs from 'node:fs';
const file = 'apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> origin\/arena\/560e4c63-wab-infos\r?\n/, (_m, ours, theirs) =>
  ours.trimEnd() + '\n\n        @android.webkit.JavascriptInterface\n' + theirs.trimEnd() + '\n',
);
fs.writeFileSync(file, text, 'utf8');
console.log(!text.includes('<<<<<<<') ? 'OK' : 'STILL');
