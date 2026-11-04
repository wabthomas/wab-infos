import fs from 'node:fs';
const file = 'scripts/reader-android-release.mjs';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('rh-voice')) {
  text = text.replace(
    "const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';",
    `// APK rédaction : embarquer les sons de confirmation vocale (lecture native MediaPlayer).
if (product === 'redaction') {
  const voiceSrc = join(root, 'apps/redaction/public/rh-voice');
  const voiceDest = join(androidDir, 'app/src/main/assets/rh-voice');
  if (existsSync(voiceSrc)) {
    mkdirSync(voiceDest, { recursive: true });
    cpSync(voiceSrc, voiceDest, { recursive: true });
    console.log('[release] Sons de voix RH copiés dans les assets APK');
  }
}

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';`,
  );
  text = text.replace("import { existsSync } from 'fs';", "import { cpSync, existsSync, mkdirSync } from 'fs';");
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('rh-voice') ? 'OK' : 'MISS');
