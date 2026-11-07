import fs from 'node:fs';

// 1) Workspace : type + chargement du détail à la sélection
let w = fs.readFileSync('apps/redaction/src/components/redaction/rh/contracts-workspace.tsx', 'utf8');
w = w.replace("clauses:string; birthPlace:string", "clauses?:string; birthPlace:string");
w = w.replace(
  "  const [profile, setProfile] = useState<ContractProfile | null>(null);",
  "  const [detailLoading, setDetailLoading] = useState(false);\n  const [profile, setProfile] = useState<ContractProfile | null>(null);",
);
w = w.replace(
  "  function choose(item:ContractCase, force = false) {\n    if (!force && (selected || clauses.trim() || salary.trim()) && JSON.stringify(payload()) !== savedSnapshot && !window.confirm('Quitter ce brouillon sans enregistrer les derniÃ¨res modifications ?')) return;",
  "  async function choose(item:ContractCase, force = false) {\n    if (!force && (selected || clauses.trim() || salary.trim()) && JSON.stringify(payload()) !== savedSnapshot && !window.confirm('Quitter ce brouillon sans enregistrer les derniÃ¨res modifications ?')) return;\n    if (item.clauses === undefined) {\n      setDetailLoading(true);\n      try {\n        const response = await fetchRedaction(`/api/redaction/rh/contrats?id=${encodeURIComponent(item.id)}`, { cache: 'no-store' });\n        const data = await response.json();\n        const full = (data.contracts as ContractCase[] | undefined)?.[0];\n        if (!response.ok || !full || full.clauses === undefined) throw new Error();\n        setDetailLoading(false);\n        await choose(full, true);\n      } catch { setDetailLoading(false); setError('Impossible de charger le contrat sélectionné.'); }\n      return;\n    }",
);
w = w.replace('setClauses(item.clauses);', "setClauses(item.clauses ?? '');");
w = w.replace("clauses:item.clauses,birthPlace", "clauses:item.clauses ?? '',birthPlace");
w = w.replace(
  "{error && <p role=\"alert\" className=\"rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700\">{error}</p>}",
  "{error && <p role=\"alert\" className=\"rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700\">{error}</p>}\n    {detailLoading && <p role=\"status\" className=\"rounded-xl border border-primary/30 bg-primary/[0.04] p-3 text-sm text-primary\">Chargement du contrat…</p>}",
);
fs.writeFileSync('apps/redaction/src/components/redaction/rh/contracts-workspace.tsx', w, 'utf8');
console.log('WORKSPACE', w.includes('detailLoading') ? 'OK' : 'MISS');

// 2) Assets : compresser les images lourdes avant envoi au navigateur
let asset = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/organisation/assets/[key]/route.ts', 'utf8');
asset = asset.replace(
  "import { handleError, json, validOrigin } from '@/lib/redaction/rh/api';",
  "import sharp from 'sharp';\nimport { handleError, json, validOrigin } from '@/lib/redaction/rh/api';",
);
if (!asset.includes('decodeAsset')) {
  asset = asset.replace(
    "export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {\n  try {\n    await authorizeReader();\n    const key = await getKey(params);\n    if (!key) return json({ error: 'Ressource inconnue.' }, 404);\n    const result = await db().query(`SELECT mime_type AS \"mimeType\",'data:'||mime_type||';base64,'||encode(file_bytes,'base64') AS data FROM redaction_rh.organization_assets WHERE asset_key=$1`, [key]);\n    return json({ asset: result.rows[0]?.data ?? null, mimeType: result.rows[0]?.mimeType ?? null });\n  } catch (error) { return handleError(error); }\n}",
    `async function decodeAsset(bytes: Buffer, mimeType: string): Promise<{ data: string; mimeType: string }> {
  let output = bytes;
  let type = mimeType;
  try {
    const image = sharp(bytes, { limitInputPixels: 80_000_000 });
    const meta = await image.metadata();
    if (bytes.length > 300_000 || (meta.width ?? 0) > 1400) {
      const png = meta.format !== 'jpeg';
      output = await image.resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
        .toFormat(png ? 'png' : 'jpeg', { quality: 86 }).toBuffer();
      type = png ? 'image/png' : 'image/jpeg';
    }
  } catch { /* format inattendu : servir l'original */ }
  return { data: \`data:\${type};base64,\${output.toString('base64')}\`, mimeType: type };
}

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await authorizeReader();
    const key = await getKey(params);
    if (!key) return json({ error: 'Ressource inconnue.' }, 404);
    const result = await db().query('SELECT mime_type AS "mimeType",file_bytes AS bytes FROM redaction_rh.organization_assets WHERE asset_key=$1', [key]);
    const row = result.rows[0];
    if (!row) return json({ asset: null, mimeType: null });
    const { data, mimeType } = await decodeAsset(row.bytes as Buffer, row.mimeType as string);
    return json({ asset: data, mimeType });
  } catch (error) { return handleError(error); }
}`,
  );
}
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/organisation/assets/[key]/route.ts', asset, 'utf8');
console.log('ASSET', asset.includes('decodeAsset') ? 'OK' : 'MISS');
