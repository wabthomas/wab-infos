import { NextRequest, NextResponse } from 'next/server';
import { publishArticleToSocial } from '@/lib/social/publish-article';
import { socialConfig } from '@/lib/social/config';

export async function POST(request: NextRequest) {
  const secret =
    request.headers.get('x-social-secret') || request.headers.get('x-revalidation-secret');

  if (!secret || secret !== socialConfig.secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { slug?: string; force?: boolean };
    const slug = body.slug?.trim();
    const force = body.force === true;

    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    const result = await publishArticleToSocial(slug, { force });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[social/publish-article]', error);
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 });
  }
}
