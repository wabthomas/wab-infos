import fs from 'node:fs';

// --- official-export : logo plus grand, en-tête séparé, sceau visible derrière, signature agrandie, QR entreprise ---
let exp = fs.readFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', 'utf8');
exp = exp.replace(
  "import type { OrganizationSettings } from './organization';",
  "import type { OrganizationSettings } from './organization';\nimport { organizationQrPayload } from './organization-qr';",
);
exp = exp.replace("const headerX = doc.assets['company-logo'] ? 181 : left;", "const headerX = doc.assets['company-logo'] ? 198 : left;");
exp = exp.replace("const qrY = doc.verificationUrl ? footerTop - 118 : null;", "const qrY = footerTop - 118;");
exp = exp.replace("if (qrY !== null && y > qrY - 12) continue;", "if (y > qrY - 12) continue;");
exp = exp.replace("image(ctx, logo, left, 42, 96, 67);", "image(ctx, logo, left, 42, 108, 78);");
exp = exp.replace(
  "ctx.save(); ctx.globalAlpha = 0.26; image(ctx, seal, right - 165, layout.sealY, 150, 150); ctx.restore();",
  "ctx.save(); ctx.globalAlpha = 0.82; image(ctx, seal, right - 150, layout.sealY, 140, 140); ctx.restore();",
);
exp = exp.replace("|| 190", "|| 220").replace("|| 92", "|| 110");
exp = exp.replace(
  "image(ctx, signature, right - Number(doc.settings.directorSignatureWidth || 220), layout.signatureY, Number(doc.settings.directorSignatureWidth || 220), Number(doc.settings.directorSignatureHeight || 110));",
  "image(ctx, signature, right - Number(doc.settings.directorSignatureWidth || 220), layout.signatureY + 10, Number(doc.settings.directorSignatureWidth || 220), Number(doc.settings.directorSignatureHeight || 110));",
);
// QR : contenu entreprise + lien de vérification, toujours présent.
exp = exp.replace(
  "doc.verificationUrl ? import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(doc.verificationUrl!, { errorCorrectionLevel: 'H', margin: 4, width: 520, color: { dark: '#161616', light: '#FFFFFF' } })).then(load) : Promise.resolve(null),",
  "import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL([organizationQrPayload(doc.settings), doc.verificationUrl].filter(Boolean).join('\\n'), { errorCorrectionLevel: 'M', margin: 4, width: 560, color: { dark: '#000000', light: '#FFFFFF' } })).then(load),",
);
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', exp, 'utf8');
console.log('EXPORT_PATCHED');

// --- organization : réglage heure de sortie + signature par défaut plus grande ---
let org = fs.readFileSync('apps/redaction/src/lib/redaction/rh/organization.ts', 'utf8');
if (!org.includes('attendanceEndTime')) {
  org = org.replace("  directorSignatureHeight: 'Hauteur de la signature image (px)',", "  directorSignatureHeight: 'Hauteur de la signature image (px)',\n  attendanceEndTime: 'Heure limite de signature de sortie (HH:MM)',");
  org = org.replace("  directorSignatureWidth: '190',", "  directorSignatureWidth: '220',");
  org = org.replace("  directorSignatureHeight: '92',", "  directorSignatureHeight: '110',\n  attendanceEndTime: '18:00',");
}
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/organization.ts', org, 'utf8');
console.log('ORG_PATCHED');

// --- route organisation : longueur + validation de l'heure ---
let route = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/organisation/route.ts', 'utf8');
if (!route.includes('attendanceEndTime')) {
  route = route.replace('documentFooter: 1200,', 'documentFooter: 1200, attendanceEndTime: 5,');
  route = route.replace(
    "const website = normalized.find(([key]) => key === 'companyWebsite')?.[1];",
    "const endTime = normalized.find(([key]) => key === 'attendanceEndTime')?.[1];\n    if (endTime && !/^([01]\\\\d|2[0-3]):[0-5]\\\\d$/.test(endTime)) return json({ error: 'Heure de sortie invalide (format HH:MM).' }, 400);\n    const website = normalized.find(([key]) => key === 'companyWebsite')?.[1];",
  );
}
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/organisation/route.ts', route, 'utf8');
console.log('ROUTE_PATCHED');
