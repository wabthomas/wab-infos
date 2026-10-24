import { NextResponse } from 'next/server';
import { fetchSiteCompetition } from '@/lib/seo/site-seo-client';
import { RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';

/** Veille concurrence (RSS actualite.cd, Radio Okapi, 7sur7…) pour la rédaction. */
export async function GET(request: Request) {
  try {
    await requireRedactionUser();
    const url = new URL(request.url);
    const hours = Number(url.searchParams.get('hours'));
    const refresh = url.searchParams.get('refresh') === '1';

    const snapshot = await fetchSiteCompetition({
      hours: Number.isFinite(hours) && hours > 0 ? hours : undefined,
      refresh,
    });

    return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Veille indisponible';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
