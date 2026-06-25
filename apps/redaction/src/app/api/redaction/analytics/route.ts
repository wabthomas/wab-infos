import { NextResponse } from 'next/server';
import { getAuthorAnalytics } from '@/lib/redaction/admin-analytics';
import {
  getEditorProfile,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';
import type { AdminStatsRange } from '@/lib/redaction/types';

function parseRange(value: string | null): AdminStatsRange {
  const n = Number(value);
  if (n === 7 || n === 30 || n === 90 || n === 365) return n;
  return 30;
}

export async function GET(request: Request) {
  try {
    const user = await requireRedactionUser();
    const { author } = await getEditorProfile(user);
    const { searchParams } = new URL(request.url);
    const days = parseRange(searchParams.get('days'));
    const analytics = await getAuthorAnalytics(author.documentId, days);
    return NextResponse.json({ analytics });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Statistiques indisponibles';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
