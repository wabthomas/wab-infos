import { NextRequest, NextResponse } from 'next/server';
import { sendArticleNewsletter } from '@/lib/newsletter/send-article';
import { newsletterConfig } from '@/lib/newsletter/config';

export async function POST(request: NextRequest) {
  const secret =
    request.headers.get('x-newsletter-secret') ||
    request.headers.get('x-revalidation-secret');

  if (!secret || secret !== newsletterConfig.secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { slug?: string };
    const slug = body.slug?.trim();

    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    const result = await sendArticleNewsletter(slug);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[newsletter/send-article]', error);
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}
