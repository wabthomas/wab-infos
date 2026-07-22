import { NextResponse } from 'next/server';
import {
  createRedactionGoogleSession,
} from '@/lib/redaction/google-auth-session';
import { RedactionAuthError } from '@/lib/redaction/strapi-editor';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      accessToken?: string;
      remember?: boolean;
    };

    const accessToken = body.accessToken?.trim() ?? '';
    if (!accessToken) {
      return NextResponse.json({ error: 'Jeton Google manquant' }, { status: 400 });
    }

    const remember = body.remember !== false;
    const { user } = await createRedactionGoogleSession(request, accessToken, remember);

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[redaction/auth/google]', err);
    return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });
  }
}
