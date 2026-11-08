import fs from 'node:fs';
const file = 'apps/redaction/src/app/api/redaction/newsletter/route.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.includes('const smtpHost = body.smtpHost?.trim()'));
const end = lines.findIndex((line, i) => i >= start && line.trim() === '}' && lines[i - 1]?.trim() === ');');
if (start < 0 || end < 0) { console.log('MISS'); process.exit(1); }
lines.splice(start, end - start + 1,
  "    const provider = body.provider === 'brevo' ? 'brevo' : 'smtp';",
  "    const smtpHost = body.smtpHost?.trim() || '';",
  "    const smtpUser = body.smtpUser?.trim() || '';",
  "    const senderEmail = body.senderEmail?.trim() || '';",
  '    const smtpPort = Number(body.smtpPort);',
  "    if (!senderEmail || (provider === 'smtp' && (!smtpHost || !smtpUser || !Number.isFinite(smtpPort) || smtpPort <= 0))) {",
  '      return NextResponse.json(',
  "        { error: provider === 'brevo' ? 'Adresse expéditrice requise.' : 'Hôte, port, utilisateur et expéditeur sont requis.' },",
  '        { status: 400 }',
  '      );',
  '    }',
);
const enabledLine = lines.findIndex(line => line.trim() === 'enabled: body.enabled !== false,');
lines.splice(enabledLine + 1, 0, '      provider,', '      brevoApiKey: body.brevoApiKey,');
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('OK');
