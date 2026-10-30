import { requireEditorialUser } from '@/lib/redaction/editorial-access';
import { NextResponse } from 'next/server';
import { processImportedDraftsWithAi } from '@/lib/ai/process-imports';
import {
  isRedactionSuperAdmin,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

function authorizedBySecret(request: Request): boolean {
  const secret = request.headers.get('x-revalidation-secret');
  return Boolean(secret && secret === process.env.REVALIDATION_SECRET);
}

export async function POST(request: Request) {
  try {
    if (!authorizedBySecret(request)) {
      const user = await requireEditorialUser();
      if (!isRedactionSuperAdmin(user)) {
        return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
      }
    }

    let limit: number | undefined;
    try {
      const body = (await request.json()) as { limit?: number };
      if (typeof body.limit === 'number') limit = body.limit;
    } catch {
      // body optional
    }

    const result = await processImportedDraftsWithAi(limit);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Traitement IA impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
