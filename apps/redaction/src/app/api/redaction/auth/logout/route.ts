import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { REDACTION_COOKIE, REDACTION_REMEMBER_COOKIE } from '@/lib/redaction/config';

export async function POST() {
  const jar = await cookies();
  jar.delete(REDACTION_COOKIE);
  jar.delete(REDACTION_REMEMBER_COOKIE);
  return NextResponse.json({ ok: true });
}
