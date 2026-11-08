import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/recipient-priority.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  "export function recipientRank(email: string): number {\n  const normalized = email.trim().toLowerCase();\n  const [local, domain] = normalized.split('@');\n  if (!local || !domain) return 3;\n  if (DISPOSABLE_DOMAINS.has(domain)) return 3;\n  if (ROLE_LOCAL_PARTS.has(local.split('+')[0])) return 2;\n  return 0;\n}",
  "const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);\n\nexport function recipientRank(email: string): number {\n  const normalized = email.trim().toLowerCase();\n  const [local, domain] = normalized.split('@');\n  if (!local || !domain) return 3;\n  if (DISPOSABLE_DOMAINS.has(domain)) return 3;\n  if (ROLE_LOCAL_PARTS.has(local.split('+')[0])) return 2;\n  // Gmail d'abord : meilleure réputation et traitement rapide des lots.\n  if (GMAIL_DOMAINS.has(domain)) return 0;\n  return 1;\n}",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('GMAIL_DOMAINS') ? 'OK' : 'MISS');
