import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/queue.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  "    item.cursor += slice.length;\n    item.sent += result.sent;\n    item.failed += result.failed;\n    const remaining = item.recipients.length - item.cursor;\n    if (remaining <= 0) item.completedAt = new Date().toISOString();\n    file.lastSentAt = new Date().toISOString();\n    await writeQueue(file);\n    return { sent: result.sent, failed: result.failed, remaining: Math.max(0, remaining) };",
  "    file.lastSentAt = new Date().toISOString();\n    // Aucun destinataire ne doit être perdu : en cas d'échec SMTP, on réessaiera le même lot.\n    if (result.failed > 0) {\n      item.failed += result.failed;\n      item.attempts = (item.attempts ?? 0) + 1;\n      await writeQueue(file);\n      return { sent: result.sent, failed: result.failed, remaining: item.recipients.length - item.cursor, retry: true };\n    }\n    item.cursor += slice.length;\n    item.sent += result.sent;\n    const remaining = item.recipients.length - item.cursor;\n    if (remaining <= 0) item.completedAt = new Date().toISOString();\n    await writeQueue(file);\n    return { sent: result.sent, failed: 0, remaining: Math.max(0, remaining) };",
);
text = text.replace("  completedAt?: string;\n};", "  completedAt?: string;\n  attempts?: number;\n};");
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('réessaiera') && text.includes('attempts?: number') ? 'OK' : 'MISS');
