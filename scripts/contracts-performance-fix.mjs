import fs from 'node:fs';

// --- Workspace : choisir un contrat charge son détail (clauses) ---
const wfile = 'apps/redaction/src/components/redaction/rh/contracts-workspace.tsx';
const weol = fs.readFileSync(wfile, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const wlines = fs.readFileSync(wfile, 'utf8').split(/\r?\n/);
const start = wlines.findIndex(line => line.includes('function choose(item:ContractCase'));
if (start < 0) { console.log('MISS choose'); process.exit(1); }
wlines[start] = wlines[start].replace('function choose(item:ContractCase', 'async function choose(item:ContractCase');
const guard = wlines.findIndex((line, i) => i > start && line.includes('if (!force && (selected || clauses.trim()'));
if (guard < 0) { console.log('MISS guard'); process.exit(1); }
wlines.splice(guard + 1, 0,
  '    if (item.clauses === undefined) {',
  '      setDetailLoading(true);',
  '      try {',
  '        const response = await fetchRedaction(`/api/redaction/rh/contrats?id=${encodeURIComponent(item.id)}`, { cache: \'no-store\' });',
  '        const data = await response.json();',
  '        const full = (data.contracts as ContractCase[] | undefined)?.[0];',
  '        if (!response.ok || !full || full.clauses === undefined) throw new Error();',
  '        setDetailLoading(false);',
  '        await choose(full, true);',
  '      } catch { setDetailLoading(false); setError(\'Impossible de charger le contrat sélectionné.\'); }',
  '      return;',
  '    }',
);
for (let i = start; i < wlines.length; i += 1) {
  if (wlines[i].includes('setClauses(item.clauses);')) wlines[i] = wlines[i].replace('setClauses(item.clauses);', "setClauses(item.clauses ?? '');");
  if (wlines[i].includes('function newCase(')) break;
}
fs.writeFileSync(wfile, wlines.join(weol), 'utf8');
console.log('WORKSPACE', fs.readFileSync(wfile, 'utf8').includes('setDetailLoading(true)') ? 'OK' : 'MISS');

// --- Asset : compression des fichiers lourds ---
const afile = 'apps/redaction/src/app/api/redaction/rh/organisation/assets/[key]/route.ts';
const aeol = fs.readFileSync(afile, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const alines = fs.readFileSync(afile, 'utf8').split(/\r?\n/);
const importIndex = alines.findIndex(line => line.includes("from '@/lib/redaction/rh/api'"));
if (importIndex >= 0 && !alines.some(line => line.includes("import sharp"))) alines.splice(importIndex + 1, 0, "import sharp from 'sharp';");
const getStart = alines.findIndex(line => line.startsWith('export async function GET'));
if (getStart < 0) { console.log('MISS get'); process.exit(1); }
let getEnd = getStart + 1;
while (getEnd < alines.length && alines[getEnd] !== '}') getEnd += 1;
const replacement = [
  'async function decodeAsset(bytes: Buffer, mimeType: string): Promise<{ data: string; mimeType: string }> {',
  '  let output = bytes;',
  '  let type = mimeType;',
  '  try {',
  '    const image = sharp(bytes, { limitInputPixels: 80_000_000 });',
  '    const meta = await image.metadata();',
  '    if (bytes.length > 300_000 || (meta.width ?? 0) > 1400) {',
  "      const png = meta.format !== 'jpeg';",
  '      output = await image.resize({ width: 1400, height: 1400, fit: \'inside\', withoutEnlargement: true })',
  "        .toFormat(png ? 'png' : 'jpeg', { quality: 86 }).toBuffer();",
  "      type = png ? 'image/png' : 'image/jpeg';",
  '    }',
  "  } catch { /* format inattendu : servir l'original */ }",
  '  return { data: `data:${type};base64,${output.toString(\'base64\')}`, mimeType: type };',
  '}',
  '',
  'export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {',
  '  try {',
  '    await authorizeReader();',
  '    const key = await getKey(params);',
  "    if (!key) return json({ error: 'Ressource inconnue.' }, 404);",
  '    const result = await db().query(\'SELECT mime_type AS "mimeType",file_bytes AS bytes FROM redaction_rh.organization_assets WHERE asset_key=$1\', [key]);',
  '    const row = result.rows[0];',
  '    if (!row) return json({ asset: null, mimeType: null });',
  '    const { data, mimeType } = await decodeAsset(row.bytes as Buffer, row.mimeType as string);',
  '    return json({ asset: data, mimeType });',
  '  } catch (error) { return handleError(error); }',
  '}',
];
alines.splice(getStart, getEnd - getStart + 1, ...replacement);
fs.writeFileSync(afile, alines.join(aeol), 'utf8');
console.log('ASSET', fs.readFileSync(afile, 'utf8').includes('decodeAsset') ? 'OK' : 'MISS');
