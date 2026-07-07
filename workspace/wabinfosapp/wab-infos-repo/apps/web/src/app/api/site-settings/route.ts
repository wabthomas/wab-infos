import { NextResponse } from 'next/server';
import { getSiteSettings } from '@/lib/site-settings.server';

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(settings, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
