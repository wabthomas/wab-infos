import { NextRequest, NextResponse } from 'next/server';
import { pushConfig } from '@/lib/push/config';
import { publishArticlePush } from '@/lib/push/publish-article';

export async function POST(request: NextRequest) {
  const secret =
    request.headers.get('x-push-secret') || request.headers.get('x-revalidation-secret');

  if (!secret || secret !== pushConfig.secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { slug?: string };
    const slug = body.slug?.trim();

    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    const result = await publishArticlePush(slug);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[push/publish-article]', error);
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 });
  }
}
