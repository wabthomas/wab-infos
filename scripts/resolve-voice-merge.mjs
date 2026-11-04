import fs from 'node:fs';

// MainActivity : garder les imports impression + les imports voix native.
let java = fs.readFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java', 'utf8');
java = java.replace(
  /<<<<<<< HEAD\r?\nimport android\.print\.PrintAttributes;[\s\S]*?>>>>>>> origin\/arena\/560e4c63-wab-infos\r?\n/,
  `import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.content.ContentValues;
`,
);
java = java.replace(
  /<<<<<<< HEAD\r?\n    \/\*\* Pont JS[\s\S]*?=======\r?\n([\s\S]*?)>>>>>>> origin\/arena\/560e4c63-wab-infos\r?\n/,
  '$1',
);
fs.writeFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java', java, 'utf8');
console.log('JAVA', java.includes('<<<<<<<') ? 'STILL' : 'OK');

// Service worker : cache v6 + URLs complètes (page/script) + sons en chemins.
let sw = fs.readFileSync('apps/redaction/public/sw-redaction.js', 'utf8');
sw = sw.replace(
  /<<<<<<< HEAD\r?\n[\s\S]*?>>>>>>> origin\/arena\/560e4c63-wab-infos\r?\n/,
  `const OFFLINE_CACHE = 'redaction-offline-v6';
const OFFLINE_URL = new URL('redaction-offline.html', self.registration.scope).href;
const OFFLINE_PATH = new URL(OFFLINE_URL).pathname;
const OFFLINE_SCRIPT = new URL('redaction-offline.js', self.registration.scope).href;
`,
);
sw = sw.replace("if (new URL(request.url).pathname !== OFFLINE_URL)", "if (new URL(request.url).pathname !== OFFLINE_PATH)");
sw = sw.replace("Response.redirect(new URL(OFFLINE_URL, self.location.origin).href, 302)", "Response.redirect(OFFLINE_URL, 302)");
sw = sw.replace("event.request.url === new URL(OFFLINE_SCRIPT, self.location.origin).href", "event.request.url === OFFLINE_SCRIPT");
fs.writeFileSync('apps/redaction/public/sw-redaction.js', sw, 'utf8');
console.log('SW', sw.includes('<<<<<<<') ? 'STILL' : 'OK');

// Paramètres RH : garder annonce + test voix admin.
let page = fs.readFileSync('apps/redaction/src/app/(editor)/rh/parametres/page.tsx', 'utf8');
page = page.replace(
  /<<<<<<< HEAD\r?\n    <AnnouncementSettings \/>\r?\n=======\r?\n    <RhVoiceAdminTest \/>\r?\n>>>>>>> origin\/arena\/560e4c63-wab-infos\r?\n/,
  `    <AnnouncementSettings />
    <RhVoiceAdminTest />
`,
);
fs.writeFileSync('apps/redaction/src/app/(editor)/rh/parametres/page.tsx', page, 'utf8');
console.log('PAGE', page.includes('<<<<<<<') ? 'STILL' : 'OK');
