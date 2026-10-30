import { requireEditorialUser } from '@/lib/redaction/editorial-access';
import { NextResponse } from 'next/server';
import { countPendingComments, RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export async function GET() {
  try {
    await requireEditorialUser();
    const count = await countPendingComments();
    return NextResponse.json({ count });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ count: 0 });
  }
}
