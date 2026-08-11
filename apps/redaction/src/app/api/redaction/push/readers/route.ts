import { NextResponse } from 'next/server';
import {
  isRedactionSuperAdmin,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export async function POST(request: Request) {
  try {
    const user = await requireRedactionUser();
    if (!isRedactionSuperAdmin(user)) {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
    }

    const secret = process.env.PUSH_SECRET || process.env.REVALIDATION_SECRET;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(/\/$/, '');
    if (!secret) {
      return NextResponse.json({ error: 'PUSH_SECRET manquant' }, { status: 500 });
    }

    const payload = (await request.json()) as {
      title?: string;
      body?: string;
      url?: string;
      target?: 'site' | 'youtube';
    };

    const res = await fetch(`${siteUrl}/api/push/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-push-secret': secret,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      sent?: number;
      failed?: number;
      error?: string;
    };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || `HTTP ${res.status}` },
        { status: res.status }
      );
    }
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Envoi impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
