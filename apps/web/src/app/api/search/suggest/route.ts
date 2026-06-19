import { NextResponse } from 'next/server';
import { getSearchSuggestions } from '@/lib/search-suggestions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [], query });
  }

  const suggestions = await getSearchSuggestions(query, 6);
  return NextResponse.json({ suggestions, query });
}
