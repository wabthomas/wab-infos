import { NextResponse } from 'next/server';
import { getAiSettingsAdminView } from '@/lib/ai/stored-settings';
import { peekAiQuota } from '@/lib/ai/quotas';
import {
  isRedactionSuperAdmin,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export async function GET() {
  try {
    const user = await requireRedactionUser();
    if (!isRedactionSuperAdmin(user)) {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
    }
    const settings = await getAiSettingsAdminView();
    return NextResponse.json({
      ...settings,
      quotas: {
        reformulate: peekAiQuota('reformulate', settings.dailyReformulateLimit),
        publish: peekAiQuota('publish', settings.dailyPublishLimit),
        research: peekAiQuota('research', settings.dailyResearchLimit),
      },
    });
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Statut IA indisponible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
