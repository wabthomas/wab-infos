import { NextResponse } from 'next/server';
import { sendReaderDailyEngagementIfDue } from '@/lib/push/broadcast';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendReaderDailyEngagementIfDue();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reader engagement failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
