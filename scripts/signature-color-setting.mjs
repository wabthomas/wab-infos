import fs from 'node:fs';
// 1) Réglage couleur dans organization.ts
let org = fs.readFileSync('apps/redaction/src/lib/redaction/rh/organization.ts', 'utf8');
if (!org.includes('signatureColor')) {
  org = org.replace("  attendanceEndTime: 'Heure limite de signature de sortie (HH:MM)',", "  attendanceEndTime: 'Heure limite de signature de sortie (HH:MM)',\n  signatureColor: 'Couleur de la signature (hex)',");
  org = org.replace("  attendanceEndTime: '18:00',", "  attendanceEndTime: '18:00',\n  signatureColor: '#1a3faa',");
}
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/organization.ts', org, 'utf8');
console.log('ORG', org.includes('signatureColor') ? 'OK' : 'MISS');

// 2) Validation route organisation
let route = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/organisation/route.ts', 'utf8');
if (!route.includes('signatureColor')) {
  route = route.replace('attendanceEndTime: 5,', 'attendanceEndTime: 5, signatureColor: 7,');
  route = route.replace(
    "const endTime = normalized.find(([key]) => key === 'attendanceEndTime')?.[1];",
    "const signatureColor = normalized.find(([key]) => key === 'signatureColor')?.[1];\n    if (signatureColor && !/^#[0-9a-fA-F]{6}$/.test(signatureColor)) return json({ error: 'Couleur de signature invalide (format #RRGGBB).' }, 400);\n    const endTime = normalized.find(([key]) => key === 'attendanceEndTime')?.[1];",
  );
}
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/organisation/route.ts', route, 'utf8');
console.log('ROUTE', route.includes('signatureColor') ? 'OK' : 'MISS');

// 3) Champ couleur dans Paramètres
let ui = fs.readFileSync('apps/redaction/src/components/redaction/rh/organization-settings.tsx', 'utf8');
if (!ui.includes('signatureColor')) {
  ui = ui.replace(
    "{<label className=\"text-sm font-medium\">{ORGANIZATION_SETTING_LABELS.attendanceEndTime}",
    "{<label className=\"text-sm font-medium\">{ORGANIZATION_SETTING_LABELS.signatureColor}<input type=\"color\" value={settings.signatureColor} onChange={(event) => change('signatureColor', event.target.value)} className=\"mt-1 block h-11 w-full rounded-lg border border-border bg-background px-2 py-1.5\" /></label>}\n        {<label className=\"text-sm font-medium\">{ORGANIZATION_SETTING_LABELS.attendanceEndTime}",
  );
}
fs.writeFileSync('apps/redaction/src/components/redaction/rh/organization-settings.tsx', ui, 'utf8');
console.log('UI', ui.includes('signatureColor') ? 'OK' : 'MISS');

// 4) Signature texte du contrat en couleur admin
let sign = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/mon-espace/contrats/[id]/route.ts', 'utf8');
if (!sign.includes('signatureColor')) {
  sign = sign.replace(
    "      const normalize = (value: string) => value.trim().replace(/\\s+/g,' ').toLocaleLowerCase('fr');",
    "      const normalize = (value: string) => value.trim().replace(/\\s+/g,' ').toLocaleLowerCase('fr');\n      const colorRow = await client.query(\"SELECT setting_value FROM redaction_rh.organization_settings WHERE setting_key='signatureColor'\");\n      const signatureColor = /^#[0-9a-fA-F]{6}$/.test(colorRow.rows[0]?.setting_value || '') ? colorRow.rows[0].setting_value : '#1a3faa';",
  );
  sign = sign.replace('fill="#1c2635"', 'fill="${signatureColor}"');
}
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/mon-espace/contrats/[id]/route.ts', sign, 'utf8');
console.log('SIGN', sign.includes('signatureColor') ? 'OK' : 'MISS');
