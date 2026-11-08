import { db } from '@/lib/redaction/rh/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Logo d'entreprise utilisé dans les e-mails RH. Ressource de marque, non sensible. */
export async function GET() {
  try {
    const result = await db().query("SELECT file_bytes,mime_type FROM redaction_rh.organization_assets WHERE asset_key='company-logo'");
    const row = result.rows[0];
    if (!row?.file_bytes) return new Response('Logo absent', { status: 404 });
    return new Response(new Uint8Array(row.file_bytes as Buffer), {
      headers: {
        'Content-Type': row.mime_type || 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new Response('Logo indisponible', { status: 404 });
  }
}
