import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/newsletter-admin.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.includes('export async function sendNewsletterTest(to: string)'));
const guard = lines.findIndex((line, i) => i > start && line.includes("if (!EMAIL_PATTERN.test(email)"));
const branch = [
  '  const settingsView = await getNewsletterSettings();',
  "  if (settingsView.provider === 'brevo') {",
  "    const stored = await strapi<{ data?: { brevoApiKey?: string } | null }>('/newsletter-setting');",
  "    const key = stored.data?.data?.brevoApiKey?.trim() || process.env.BREVO_API_KEY?.trim() || '';",
  "    if (!key) throw new Error('Clé API Brevo manquante : enregistrez-la dans E-mails.');",
  "    const response = await fetch('https://api.brevo.com/v3/smtp/email', {",
  "      method: 'POST',",
  "      headers: { 'api-key': key, 'Content-Type': 'application/json' },",
  '      body: JSON.stringify({',
  "        sender: { name: settingsView.senderName || 'Wab-infos', email: settingsView.senderEmail },",
  '        to: [{ email }],',
  "        subject: 'Test newsletter — Wab-infos',",
  "        htmlContent: `<div style=\"padding:24px;font-family:Arial,sans-serif;color:#18181b\"><h1 style=\"font-size:20px\">Test Brevo réussi</h1><p>Ceci est un e-mail de test envoyé depuis la rédaction Wab-infos. Le fournisseur Brevo est correctement configuré.</p></div>`,",
  "        textContent: 'Ceci est un e-mail de test envoyé depuis la rédaction Wab-infos. La configuration Brevo fonctionne.',",
  '      }),',
  '    });',
  "    if (!response.ok) throw new Error(`Brevo API ${response.status}: ${(await response.text()).slice(0, 160)}`);",
  '    return;',
  '  }',
  '',
];
if (start >= 0 && guard >= 0 && !lines.some(line => line.includes('Test Brevo réussi'))) lines.splice(guard + 1, 0, ...branch);
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(lines.some(line => line.includes('Test Brevo réussi')) ? 'OK' : 'MISS');
