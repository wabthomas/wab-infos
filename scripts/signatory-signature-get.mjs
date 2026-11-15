import fs from 'node:fs';
const file = 'apps/redaction/src/app/api/redaction/rh/signataires/[id]/signature/route.ts';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('export async function GET')) {
  text = text.replace("import { json, handleError, validOrigin } from '@/lib/redaction/rh/api';", "import { json, handleError, validOrigin } from '@/lib/redaction/rh/api';\nimport { db } from '@/lib/redaction/rh/database';");
  text += `\nexport async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {\n  try {\n    await requireRhPermission('access_manage');\n    const { id } = await params;\n    const result = await db().query('SELECT signature_bytes AS bytes, signature_mime AS mime FROM redaction_rh.document_signatories WHERE id=$1', [id]);\n    const row = result.rows[0];\n    if (!row?.bytes) return json({ error: 'Signature absente.' }, 404);\n    return new Response(new Uint8Array(row.bytes as Buffer), { headers: { 'Content-Type': row.mime || 'image/png', 'Cache-Control': 'private, no-store' } });\n  } catch (error) { return handleError(error); }\n}\n`;
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('export async function GET') ? 'OK' : 'MISS');
