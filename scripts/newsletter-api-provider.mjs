import fs from 'node:fs';
const file = 'apps/redaction/src/app/api/redaction/newsletter/route.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
for (let i = 0; i < lines.length; i += 1) {
  if (lines[i].includes('const body = (await request.json()) as {')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('replyTo?: string;')) j += 1;
    lines.splice(j + 1, 0, "      provider?: 'smtp' | 'brevo';", '      brevoApiKey?: string;');
    break;
  }
}
let text = lines.join(eol);
text = text.replace(
  "    const smtpHost = body.smtpHost?.trim() || '';\n    const smtpUser = body.smtpUser?.trim() || '';\n    const senderEmail = body.senderEmail?.trim() || '';\n    const smtpPort = Number(body.smtpPort);\n    if (!smtpHost || !smtpUser || !senderEmail || !Number.isFinite(smtpPort) || smtpPort <= 0) {\n      return NextResponse.json(\n        { error: 'Hôtes, port, utilisateur et expéditeur sont requis.' },\n        { status: 400 }\n      );\n    }",
  "    const provider = body.provider === 'brevo' ? 'brevo' : 'smtp';\n    const smtpHost = body.smtpHost?.trim() || '';\n    const smtpUser = body.smtpUser?.trim() || '';\n    const senderEmail = body.senderEmail?.trim() || '';\n    const smtpPort = Number(body.smtpPort);\n    if (!senderEmail || (provider === 'smtp' && (!smtpHost || !smtpUser || !Number.isFinite(smtpPort) || smtpPort <= 0))) {\n      return NextResponse.json(\n        { error: provider === 'brevo' ? 'Adresse expéditrice requise.' : 'Hôte, port, utilisateur et expéditeur sont requis.' },\n        { status: 400 }\n      );\n    }",
);
text = text.replace(
  "    const settings = await saveNewsletterSettings({\n      enabled: body.enabled !== false,\n      smtpHost,",
  "    const settings = await saveNewsletterSettings({\n      enabled: body.enabled !== false,\n      provider,\n      brevoApiKey: body.brevoApiKey,\n      smtpHost,",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes("provider === 'brevo'") && text.includes('brevoApiKey: body.brevoApiKey') ? 'OK' : 'MISS');
