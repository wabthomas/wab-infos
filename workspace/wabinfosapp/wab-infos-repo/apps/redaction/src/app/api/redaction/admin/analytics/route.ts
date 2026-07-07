import { NextResponse } from 'next/server';
import { getAdminAnalytics } from '@/lib/redaction/admin-analytics';
import {
  RedactionAuthError,
  requireRedactionSuperAdmin,
} from '@/lib/redaction/strapi-editor';
import type { AdminStatsRange } from '@/lib/redaction/types';

function parseRange(value: string | null): AdminStatsRange {
  const n = Number(value);
  if (n === 7 || n === 30 || n === 90 || n === 365) return n;
  return 30;
}

export async function GET(request: Request) {
  try {
    await requireRedactionSuperAdmin();
    const { searchParams } = new URL(request.url);
    const days = parseRange(searchParams.get('days'));
    const analytics = await getAdminAnalytics(days);
    return NextResponse.json({ analytics });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      const status = err.message.includes('administrateurs') ? 403 : 401;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : 'Statistiques indisponibles';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
