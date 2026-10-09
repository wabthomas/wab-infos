import { NextResponse } from 'next/server';
import { addNewsletterSubscribers, listNewsletterSubscribers } from '@/lib/redaction/newsletter-admin';
import {
  isRedactionSuperAdmin,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

async function requireAdmin() {
  const user = await requireRedactionUser();
  if (!isRedactionSuperAdmin(user)) {
    return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const q = url.searchParams.get('q') || '';
    const list = await listNewsletterSubscribers(page, q);
    return NextResponse.json(list);
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Liste impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;
    const body = (await request.json()) as { emails?: string };
    if (!body.emails?.trim()) {
      return NextResponse.json({ error: 'Ajoutez au moins une adresse.' }, { status: 400 });
    }
    const result = await addNewsletterSubscribers(body.emails);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Import impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
