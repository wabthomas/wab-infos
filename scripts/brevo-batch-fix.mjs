import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/queue.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace("queueBatchSize = () => (isBrevo() ? Math.max(1, Math.min(newsletterConfig.brevoBatchSize, newsletterConfig.maxRecipientsPerRun))", "queueBatchSize = () => (isBrevo() ? Math.max(1, newsletterConfig.brevoBatchSize)");
fs.writeFileSync(file, text, 'utf8');
console.log('OK');
