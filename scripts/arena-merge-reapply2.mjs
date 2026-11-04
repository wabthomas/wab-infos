import fs from 'node:fs';

// organization-settings : champ heure de sortie + upload PNG tolérant
let ui = fs.readFileSync('apps/redaction/src/components/redaction/rh/organization-settings.tsx', 'utf8');
if (!ui.includes('attendanceEndTime')) {
  ui = ui.replace(
    "{signatureSizes.map(key => <label",
    `{<label className="text-sm font-medium">{ORGANIZATION_SETTING_LABELS.attendanceEndTime}<input type="time" value={settings.attendanceEndTime} onChange={(event) => change('attendanceEndTime', event.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2.5" /></label>}
        {signatureSizes.map(key => <label`,
  );
}
ui = ui.replace(
  "if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2_000_000) {",
  "const imageByName = /\\.(jpe?g|png|webp)$/i.test(file.name);\n    if (!(['image/jpeg','image/png','image/webp'].includes(file.type) || imageByName) || file.size > 2_000_000) {",
);
ui = ui.replace(/Choisissez une image JPG, PNG ou WebP de 2 Mo maximum\./g, 'Choisissez une image JPG, PNG (transparence acceptée) ou WebP de 2 Mo maximum.');
fs.writeFileSync('apps/redaction/src/components/redaction/rh/organization-settings.tsx', ui, 'utf8');
console.log('SETTINGS_PATCHED');

// official-export : repli sceau RH
let exp = fs.readFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', 'utf8');
exp = exp.replace(
  "type Assets = Record<'company-logo' | 'document-header' | 'document-footer' | 'director-signature' | 'company-seal', string | null>;",
  "type Assets = Record<'company-logo' | 'document-header' | 'document-footer' | 'director-signature' | 'company-seal' | 'rh-seal', string | null>;",
);
exp = exp.replace("load(doc.assets['company-seal']),", "load(doc.assets['company-seal'] || doc.assets['rh-seal'] || null),");
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', exp, 'utf8');

// official-documents : sceau RH + barre d'outils hors impression
let docs = fs.readFileSync('apps/redaction/src/components/redaction/rh/official-documents.tsx', 'utf8');
docs = docs.replace(
  "const assetKeys = ['company-logo','document-header','document-footer','director-signature','company-seal'] as const;",
  "const assetKeys = ['company-logo','document-header','document-footer','director-signature','company-seal','rh-seal'] as const;",
);
docs = docs.replace(
  "const emptyAssets: Assets = { 'company-logo': null, 'document-header': null, 'document-footer': null, 'director-signature': null, 'company-seal': null };",
  "const emptyAssets: Assets = { 'company-logo': null, 'document-header': null, 'document-footer': null, 'director-signature': null, 'company-seal': null, 'rh-seal': null };",
);
docs = docs.replace(
  /<div className="mt-4 flex flex-wrap items-center gap-2">\s*<button className=\{button\} disabled=\{!!busy\} type="button" onClick=\{\(\) => void exportFile\('pdf'\)\}>/,
  `<div data-official-toolbar className="no-print mt-4 flex flex-wrap items-center gap-2">\n        <button className={button} disabled={!!busy} type="button" onClick={() => void exportFile('pdf')}>`,
);
fs.writeFileSync('apps/redaction/src/components/redaction/rh/official-documents.tsx', docs, 'utf8');
console.log('DOCS_PATCHED', docs.includes('data-official-toolbar') ? 'OK' : 'MISS');

// service worker : URLs complètes tout en gardant les VOICE_URLS
let sw = fs.readFileSync('apps/redaction/public/sw-redaction.js', 'utf8');
sw = sw.replace(
  "const OFFLINE_URL = new URL('redaction-offline.html', self.registration.scope).pathname;",
  "const OFFLINE_URL = new URL('redaction-offline.html', self.registration.scope).href;\nconst OFFLINE_PATH = new URL(OFFLINE_URL).pathname;",
);
sw = sw.replace(
  "const OFFLINE_SCRIPT = new URL('redaction-offline.js', self.registration.scope).pathname;",
  "const OFFLINE_SCRIPT = new URL('redaction-offline.js', self.registration.scope).href;",
);
sw = sw.replace("if (new URL(request.url).pathname !== OFFLINE_URL)", "if (new URL(request.url).pathname !== OFFLINE_PATH)");
sw = sw.replace("Response.redirect(new URL(OFFLINE_URL, self.location.origin).href, 302)", "Response.redirect(OFFLINE_URL, 302)");
sw = sw.replace("event.request.url === new URL(OFFLINE_SCRIPT, self.location.origin).href", "event.request.url === OFFLINE_SCRIPT");
fs.writeFileSync('apps/redaction/public/sw-redaction.js', sw, 'utf8');
console.log('SW_PATCHED', sw.includes('OFFLINE_PATH') ? 'OK' : 'MISS');
