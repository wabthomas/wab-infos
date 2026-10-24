import { NextResponse } from 'next/server';
import { searchAndRead, searchWeb, type SearchFreshness } from '@/lib/ai/web-search';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Diagnostic de la recherche IA (ops / rédaction en chef).
 * Protégé par le secret interne, ne renvoie que des métadonnées, jamais le texte des pages.
 *
 * POST /api/redaction/ai/search-test
 * { "query": "...", "freshness": "day|week|month|any", "read": true, "limit": 8 }
 */
export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidation-secret');
  if (!secret || secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { query?: string; freshness?: string; read?: boolean; limit?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) return NextResponse.json({ error: 'query requis' }, { status: 400 });

  const freshness: SearchFreshness =
    body.freshness === 'day' || body.freshness === 'week' || body.freshness === 'month'
      ? body.freshness
      : 'any';
  const limit = Number.isFinite(body.limit) ? Number(body.limit) : 8;
  const startedAt = Date.now();

  try {
    if (body.read) {
      const outcome = await searchAndRead([query], { freshness, maxRead: 4, perQuery: limit });
      return NextResponse.json({
        query,
        freshness,
        durationMs: Date.now() - startedAt,
        engines: outcome.engines,
        results: outcome.results.map((row) => ({
          title: row.title,
          url: row.url,
          engine: row.engine,
          published: row.published ?? null,
          noRead: row.noRead ?? false,
        })),
        sources: outcome.sources.map((source) => ({
          url: source.url,
          title: source.title,
          via: source.via ?? null,
          chars: source.text.length,
        })),
        errors: outcome.errors,
      });
    }

    const outcome = await searchWeb(query, { freshness, limit });
    return NextResponse.json({
      query,
      freshness,
      durationMs: Date.now() - startedAt,
      engines: outcome.engines,
      results: outcome.results.map((row) => ({
        title: row.title,
        url: row.url,
        engine: row.engine,
        published: row.published ?? null,
        noRead: row.noRead ?? false,
      })),
      errors: outcome.errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Recherche impossible' },
      { status: 500 }
    );
  }
}
