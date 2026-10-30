import { requireEditorialUser } from '@/lib/redaction/editorial-access';
import { NextResponse } from 'next/server';
import {
  getNewsletterSettings,
  saveNewsletterSettings,
} from '@/lib/redaction/newsletter-admin';
import {
  isRedactionSuperAdmin,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

async function requireAdmin() {
  const user = await requireEditorialUser();
  if (!isRedactionSuperAdmin(user)) {
    return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;
    const settings = await getNewsletterSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Lecture impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;

    const body = (await request.json()) as {
      enabled?: boolean;
      smtpHost?: string;
      smtpPort?: number;
      smtpSecure?: boolean;
      smtpUser?: string;
      smtpPass?: string;
      senderEmail?: string;
      senderName?: string;
      replyTo?: string;
    };

    const smtpHost = body.smtpHost?.trim() || '';
    const smtpUser = body.smtpUser?.trim() || '';
    const senderEmail = body.senderEmail?.trim() || '';
    const smtpPort = Number(body.smtpPort);
    if (!smtpHost || !smtpUser || !senderEmail || !Number.isFinite(smtpPort) || smtpPort <= 0) {
      return NextResponse.json(
        { error: 'Hôte, port, utilisateur et expéditeur sont requis.' },
        { status: 400 }
      );
    }

    const settings = await saveNewsletterSettings({
      enabled: body.enabled !== false,
      smtpHost,
      smtpPort,
      smtpSecure: body.smtpSecure !== false,
      smtpUser,
      smtpPass: body.smtpPass,
      senderEmail,
      senderName: body.senderName?.trim() || 'Wab-infos',
      replyTo: body.replyTo?.trim() || 'redaction@wab-infos.com',
    });

    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Enregistrement impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
