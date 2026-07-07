import { NextResponse } from 'next/server';
import { getSocialFollowerStats } from '@/lib/social/follower-stats.server';

export async function GET() {
  try {
    const channels = await getSocialFollowerStats();
    return NextResponse.json(
      { channels },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch {
    return NextResponse.json({ channels: [] }, { status: 500 });
  }
}
