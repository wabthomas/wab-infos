import { NextResponse } from 'next/server';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { listEditorMedia } from '@/lib/redaction/strapi-editor';
import { handleError } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

/** Bibliothèque d’images partagée, réservée aux gestionnaires RH autorisés. */
export async function GET(request: Request) {
  try {
    await requireRhPermission('access_manage');
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
    const pageSize = Math.min(48, Math.max(6, Number(params.get('pageSize') ?? 12) || 12));
    return NextResponse.json(await listEditorMedia({
      page,
      pageSize,
      search: params.get('q') ?? undefined,
      withCount: params.get('withCount') !== '0' && page === 1,
    }));
  } catch (error) {
    return handleError(error);
  }
}
