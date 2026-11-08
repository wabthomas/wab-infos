import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/newsletter-admin.ts';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes("brevoApiKeySet: false")) {
  text = text.replace(
    "    replyTo: process.env.NEWSLETTER_REPLY_TO?.trim() || 'redaction@wab-infos.com',\n  };",
    "    replyTo: process.env.NEWSLETTER_REPLY_TO?.trim() || 'redaction@wab-infos.com',\n    provider: process.env.NEWSLETTER_PROVIDER === 'brevo' ? 'brevo' : 'smtp',\n    brevoApiKeySet: Boolean(process.env.BREVO_API_KEY),\n  };",
  );
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('brevoApiKeySet: false') || text.includes('brevoApiKeySet: Boolean(process.env.BREVO_API_KEY)') ? 'OK' : 'MISS');
