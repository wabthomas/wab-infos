import { NextResponse } from 'next/server';
import { runNewsIngest } from '@/lib/news-ingest/run';
import { unpublishAllLiveImports } from '@/lib/news-ingest/strapi';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    if (url.searchParams.get('fix') === 'unpublish-imports') {
      const fix = await unpublishAllLiveImports();
      return NextResponse.json({ ok: true, fix });
    }

    const dryRun = url.searchParams.get('dryRun') === '1';
    const sourcesParam = url.searchParams.get('sources')?.trim();
    const sourceIds = sourcesParam
      ? sourcesParam.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const result = await runNewsIngest({ dryRun, sourceIds });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'News ingest failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
