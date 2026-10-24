import { NextResponse } from 'next/server';
import { getCompetitionSnapshot } from '@/lib/seo/competition';

export const maxDuration = 60;

/**
 * Snapshot de veille concurrence pour la rédaction.
 * GET /api/seo/competition?hours=24 — protégé par x-revalidation-secret.
 */
export async function GET(request: Request) {
  const secret = request.headers.get('x-revalidation-secret');
  if (!secret || secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const hoursParam = Number(url.searchParams.get('hours'));
  const force = url.searchParams.get('refresh') === '1';

  try {
    const snapshot = await getCompetitionSnapshot({
      windowHours: Number.isFinite(hoursParam) && hoursParam > 0 ? hoursParam : undefined,
      force,
    });
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Veille indisponible' },
      { status: 500 }
    );
  }
}
