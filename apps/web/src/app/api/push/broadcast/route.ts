import { NextRequest, NextResponse } from 'next/server';
import { pushConfig } from '@/lib/push/config';
import { broadcastToReaders, type ReaderBroadcastTarget } from '@/lib/push/broadcast';

export async function POST(request: NextRequest) {
  const secret =
    request.headers.get('x-push-secret') || request.headers.get('x-revalidation-secret');
  if (!secret || secret !== pushConfig.secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      url?: string;
      target?: ReaderBroadcastTarget;
    };
    const result = await broadcastToReaders(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Envoi impossible';
    console.error('[push/broadcast]', error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
