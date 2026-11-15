import fs from 'node:fs';

// 1) GET organisation : nom/fonction = signataire actif
{
  const file = 'apps/redaction/src/app/api/redaction/rh/organisation/route.ts';
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('getActiveSignatory')) {
    text = text.replace("import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';", "import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';\nimport { getActiveSignatory } from '@/lib/redaction/rh/signatories';");
    text = text.replace(
      "    for (const row of rows.rows) if (keys.includes(row.key as OrganizationSettingKey)) settings[row.key as OrganizationSettingKey] = row.value;\n    return json({ settings, labels: ORGANIZATION_SETTING_LABELS });",
      "    for (const row of rows.rows) if (keys.includes(row.key as OrganizationSettingKey)) settings[row.key as OrganizationSettingKey] = row.value;\n    const signer = await getActiveSignatory();\n    if (signer) { settings.directorName = signer.fullName; settings.directorTitle = signer.title; }\n    return json({ settings, labels: ORGANIZATION_SETTING_LABELS });",
    );
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log('ORG', text.includes('getActiveSignatory') ? 'OK' : 'MISS');
}

// 2) GET asset director-signature : signature du signataire actif
{
  const file = 'apps/redaction/src/app/api/redaction/rh/organisation/assets/[key]/route.ts';
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('getActiveSignatory')) {
    text = text.replace("import sharp from 'sharp';", "import sharp from 'sharp';\nimport { getActiveSignatory } from '@/lib/redaction/rh/signatories';");
    text = text.replace(
      "    const key = await getKey(params);\n    if (!key) return json({ error: 'Ressource inconnue.' }, 404);\n    const result = await db().query",
      "    const key = await getKey(params);\n    if (!key) return json({ error: 'Ressource inconnue.' }, 404);\n    if (key === 'director-signature') {\n      const signer = await getActiveSignatory();\n      if (signer?.signature) return json({ asset: `data:${signer.mime || 'image/png'};base64,${signer.signature.toString('base64')}`, mimeType: signer.mime || 'image/png' });\n    }\n    const result = await db().query",
    );
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log('ASSET', text.includes('getActiveSignatory') ? 'OK' : 'MISS');
}

// 3) Émissions officielles : snapshot signataire actif
{
  const file = 'apps/redaction/src/app/api/redaction/rh/emissions/route.ts';
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('getActiveSignatory')) {
    text = text.replace("import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';", "import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';\nimport { getActiveSignatory } from '@/lib/redaction/rh/signatories';");
    text = text.replace(
      "    const hashes = Object.fromEntries(assets.rows.map(row => [row.asset_key, createHash('sha256').update(row.file_bytes).digest('hex')])) as Record<string,string>;",
      "    const hashes = Object.fromEntries(assets.rows.map(row => [row.asset_key, createHash('sha256').update(row.file_bytes).digest('hex')])) as Record<string,string>;\n    const signer = await getActiveSignatory();\n    if (signer) {\n      settings.directorName = signer.fullName;\n      settings.directorTitle = signer.title;\n      if (signer.signature) hashes['director-signature'] = createHash('sha256').update(signer.signature).digest('hex');\n    }",
    );
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log('EMISSIONS', text.includes('getActiveSignatory') ? 'OK' : 'MISS');
}

// 4) Contrats : snapshot et signature du signataire actif
{
  const file = 'apps/redaction/src/app/api/redaction/rh/contrats/route.ts';
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('getActiveSignatory')) {
    text = text.replace("import { DEFAULT_ORGANIZATION_SETTINGS } from '@/lib/redaction/rh/organization';", "import { DEFAULT_ORGANIZATION_SETTINGS } from '@/lib/redaction/rh/organization';\nimport { getActiveSignatory } from '@/lib/redaction/rh/signatories';");
    text = text.replace(
      "        const asset = Object.fromEntries(assets.rows.map(item => [item.asset_key,item.file_bytes]));",
      "        const asset = Object.fromEntries(assets.rows.map(item => [item.asset_key,item.file_bytes]));\n        const signer = await getActiveSignatory();\n        if (signer) {\n          settings.directorName = signer.fullName;\n          settings.directorTitle = signer.title;\n          if (signer.signature) asset['director-signature'] = signer.signature;\n        }",
    );
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log('CONTRACTS', text.includes('getActiveSignatory') ? 'OK' : 'MISS');
}
