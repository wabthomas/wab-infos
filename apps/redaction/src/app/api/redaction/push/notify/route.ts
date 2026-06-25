import { NextResponse } from 'next/server';
import { notifyAllEditors } from '@/lib/redaction/web-push';

export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { title?: string; body?: string; url?: string };
    if (!body.title) {
      return NextResponse.json({ error: 'title requis' }, { status: 400 });
    }

    const result = await notifyAllEditors({
      title: body.title,
      body: body.body ?? '',
      url: body.url ?? '/comments',
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Notification impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
