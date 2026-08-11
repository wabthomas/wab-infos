import { NextResponse } from 'next/server';
import {
  sendWritingReminders,
  type WritingReminderSlot,
} from '@/lib/redaction/web-push';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function resolveSlot(raw: string | null, now = new Date()): WritingReminderSlot {
  if (raw === 'morning' || raw === 'noon' || raw === 'evening') return raw;
  // Heure Kinshasa = UTC+1
  const hour = (now.getUTCHours() + 1) % 24;
  if (hour < 11) return 'morning';
  if (hour < 16) return 'noon';
  return 'evening';
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const slot = resolveSlot(url.searchParams.get('slot'));
    const result = await sendWritingReminders(slot);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Writing reminders failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
