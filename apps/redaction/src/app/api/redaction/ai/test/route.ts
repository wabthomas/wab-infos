import { requireEditorialUser } from '@/lib/redaction/editorial-access';
import { NextResponse } from 'next/server';
import { testAiProviders } from '@/lib/ai/complete-json';
import {
  isRedactionSuperAdmin,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export async function POST() {
  try {
    const user = await requireEditorialUser();
    if (!isRedactionSuperAdmin(user)) {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
    }
    const result = await testAiProviders();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Test IA impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
