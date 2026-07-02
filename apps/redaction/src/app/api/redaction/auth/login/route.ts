import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  REDACTION_COOKIE,
  REDACTION_COOKIE_MAX_AGE,
  REDACTION_COOKIE_MAX_AGE_SESSION,
  REDACTION_REMEMBER_COOKIE,
} from '@/lib/redaction/config';
import { redactionCookieOptions } from '@/lib/redaction/cookie-options';
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
    const remember = body.remember !== false;
    const maxAge = remember ? REDACTION_COOKIE_MAX_AGE : REDACTION_COOKIE_MAX_AGE_SESSION;
    const proto = request.headers.get('x-forwarded-proto');
    const cookieOptions = redactionCookieOptions(maxAge, proto);

    jar.set(REDACTION_COOKIE, jwt, cookieOptions);
    jar.set(REDACTION_REMEMBER_COOKIE, remember ? '1' : '0', {
      ...cookieOptions,
      httpOnly: true,
    });

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });
  }
}
