import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/queue.ts';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('recipient-priority')) {
  text = text.replace("import { getArticlePath } from '@/config/site';", "import { getArticlePath } from '@/config/site';\nimport { orderRecipients, recipientRank } from '@/lib/newsletter/recipient-priority';");
}
text = text.replace(
  "      articleSlug: input.slug, recipients: input.recipients, cursor: 0, sent: 0, failed: 0,",
  "      articleSlug: input.slug, recipients: orderRecipients(input.recipients.filter(recipient => recipientRank(recipient.email) < 3)), cursor: 0, sent: 0, failed: 0,",
);
text = text.replace(
  "      video: input.video, recipients: input.recipients, cursor: 0, sent: 0, failed: 0,",
  "      video: input.video, recipients: orderRecipients(input.recipients.filter(recipient => recipientRank(recipient.email) < 3)), cursor: 0, sent: 0, failed: 0,",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('orderRecipients') ? 'OK' : 'MISS');
