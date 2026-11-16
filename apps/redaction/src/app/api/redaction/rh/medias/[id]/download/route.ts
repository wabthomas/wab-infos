import { NextResponse } from 'next/server';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { getStrapiUrl } from '@/lib/redaction/config';
import { handleError } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lit une image existante pour l’import vers un emplacement privé RH, sans nouvelle copie CMS. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRhPermission('access_manage');
    const id = Number((await params).id);
    const token = process.env.STRAPI_API_TOKEN;
    if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Média invalide.' }, { status: 400 });
    if (!token) return NextResponse.json({ error: 'Bibliothèque non configurée.' }, { status: 503 });
    const base = getStrapiUrl();
    const metadata = await fetch(`${base}/api/upload/files/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!metadata.ok) return NextResponse.json({ error: 'Média introuvable.' }, { status: 404 });
    const item = await metadata.json() as { url?: string; mime?: string; name?: string };
    if (!item.url || !/^image\/(jpeg|png|webp)$/.test(item.mime ?? '')) return NextResponse.json({ error: 'Format d’image non pris en charge.' }, { status: 415 });
    const imageUrl = new URL(item.url, base);
    if (imageUrl.origin !== new URL(base).origin) return NextResponse.json({ error: 'Origine du média non autorisée.' }, { status: 400 });
    const image = await fetch(imageUrl, { cache: 'no-store' });
    if (!image.ok) return NextResponse.json({ error: 'Téléchargement du média impossible.' }, { status: 502 });
    const bytes = await image.arrayBuffer();
    if (bytes.byteLength < 16 || bytes.byteLength > 2_000_000) return NextResponse.json({ error: 'Image trop volumineuse pour un emplacement RH.' }, { status: 413 });
    return new Response(bytes, { headers: { 'Content-Type': item.mime!, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `attachment; filename="${(item.name ?? 'media').replace(/[\r\n"\\]/g, '_')}"` } });
  } catch (error) {
    return handleError(error);
  }
}
