import fs from 'node:fs';
const file = 'apps/web/src/app/layout.tsx';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('startNewsletterQueueWorker')) {
  text = text.replace("import { getSiteSettings } from '@/lib/site-settings.server';", "import { getSiteSettings } from '@/lib/site-settings.server';\nimport { startNewsletterQueueWorker } from '@/lib/newsletter/queue-worker';");
  text = text.replace("export default", "// File d'envoi newsletter : un seul worker par processus serveur.\ntry { startNewsletterQueueWorker(); } catch { /* le worker ne doit jamais bloquer le rendu */ }\n\nexport default");
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('startNewsletterQueueWorker()') ? 'OK' : 'MISS');
