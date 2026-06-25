import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  REDACTION_COOKIE,
  REDACTION_COOKIE_MAX_AGE,
  REDACTION_COOKIE_MAX_AGE_SESSION,
} from '@/lib/redaction/config';
import { loginRedactionUser, RedactionAuthError } from '@/lib/redaction/strapi-editor';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      identifier?: string;
      password?: string;
      remember?: boolean;
    };

    const identifier = body.identifier?.trim() ?? '';
    const password = body.password ?? '';

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Identifiants requis' }, { status: 400 });
    }

    const { jwt, user } = await loginRedactionUser(identifier, password);
    const jar = await cookies();
    const maxAge = body.remember !== false ? REDACTION_COOKIE_MAX_AGE : REDACTION_COOKIE_MAX_AGE_SESSION;

    jar.set(REDACTION_COOKIE, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });
  }
}
