import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/email-settings.ts';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('renderRhNotificationEmail')) {
  text = text.replace("import { db } from './database';", "import { db } from './database';\nimport { loadRhEmailBrand, renderRhNotificationEmail } from './email-template';");
  text = text.replace(
    "    await transport.sendMail({\n      from: { name: settings.fromName, address: settings.fromEmail },\n      to,\n      subject: 'Test SMTP RH — Wab-infos',\n      text: 'Ce message confirme que le SMTP des notifications RH est correctement configuré.',\n      html: '<p>Ce message confirme que le <strong>SMTP des notifications RH</strong> est correctement configuré.</p>',\n      replyTo: settings.replyTo || settings.fromEmail,\n    });",
    "    const brand = await loadRhEmailBrand();\n    const { html, text } = renderRhNotificationEmail({\n      title: 'Test de configuration SMTP',\n      body: 'Ce message confirme que le serveur SMTP des notifications RH est correctement configuré et que ce modèle e-mail est bien appliqué.',\n      link: `${brand.siteUrl}/rh/parametres`,\n      brand,\n      preheader: 'Test SMTP RH réussi.',\n    });\n    await transport.sendMail({\n      from: { name: settings.fromName, address: settings.fromEmail },\n      to,\n      subject: 'Test SMTP RH — Wab-infos',\n      text,\n      html,\n      replyTo: settings.replyTo || settings.fromEmail,\n    });",
  );
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('renderRhNotificationEmail') ? 'OK' : 'MISS');
