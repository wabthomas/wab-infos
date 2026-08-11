import { NextResponse } from 'next/server';
import {
  isRedactionSuperAdmin,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';
import {
  listPushSubscriptionsDetailed,
  notifyAllEditors,
  notifyEditorsByEmail,
} from '@/lib/redaction/web-push';

async function requireAdmin() {
  const user = await requireRedactionUser();
  if (!isRedactionSuperAdmin(user)) {
    return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;
    const subs = await listPushSubscriptionsDetailed();
    const byEmail = new Map<string, number>();
    for (const sub of subs) {
      byEmail.set(sub.userEmail, (byEmail.get(sub.userEmail) ?? 0) + 1);
    }
    const recipients = [...byEmail.entries()]
      .map(([email, deviceCount]) => ({ email, deviceCount }))
      .sort((a, b) => a.email.localeCompare(b.email));
    return NextResponse.json({ recipients });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Liste impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;

    const body = (await request.json()) as {
      title?: string;
      body?: string;
      url?: string;
      email?: string;
      all?: boolean;
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase();
    if (!body.all && !email) {
      return NextResponse.json({ error: 'Destinataire requis' }, { status: 400 });
    }

    const payload = {
      title,
      body: body.body?.trim() || '',
      url: body.url?.trim() || '/',
    };

    const result = body.all
      ? await notifyAllEditors(payload)
      : await notifyEditorsByEmail([email!], payload);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Envoi impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
