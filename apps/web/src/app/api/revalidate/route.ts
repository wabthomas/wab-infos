import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path, type, slug, category } = body as {
      path?: string;
      type?: string;
      slug?: string;
      category?: string;
    };

    if (path) {
      revalidatePath(path);
    }

    if (type === 'article' && slug && category) {
      revalidatePath(`/${category}/${slug}`);
      revalidatePath(`/${category}`);
      revalidatePath('/');
    }

    if (type === 'article') {
      revalidatePath('/sitemap.xml');
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
