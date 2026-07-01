import { NextResponse } from 'next/server';
import { RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import {
  getEditorSiteSettings,
  updateEditorSiteSettings,
} from '@/lib/redaction/site-settings';
import { normalizeSiteSettings } from '@wab-infos/shared';

export async function GET() {
  try {
    const user = await requireRedactionUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const settings = await getEditorSiteSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireRedactionUser();
    const body = (await request.json()) as { settings?: unknown };
    const settings = normalizeSiteSettings(body.settings);
    const saved = await updateEditorSiteSettings(user, settings);
    return NextResponse.json({ settings: saved });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      const status = err.message.includes('réservé') ? 403 : 401;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : 'Enregistrement impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
