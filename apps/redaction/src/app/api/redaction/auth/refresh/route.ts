import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import {
  REDACTION_COOKIE,
  REDACTION_COOKIE_MAX_AGE,
  REDACTION_COOKIE_MAX_AGE_SESSION,
  REDACTION_REMEMBER_COOKIE,
} from '@/lib/redaction/config';
import { redactionCookieOptions } from '@/lib/redaction/cookie-options';
import { RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export async function POST() {
  try {
    const user = await requireRedactionUser();
    const jar = await cookies();
    const jwt = jar.get(REDACTION_COOKIE)?.value;
    if (!jwt) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    }

    const headerList = await headers();
    const remember = jar.get(REDACTION_REMEMBER_COOKIE)?.value === '1';
    const maxAge = remember ? REDACTION_COOKIE_MAX_AGE : REDACTION_COOKIE_MAX_AGE_SESSION;
    const cookieOptions = redactionCookieOptions(maxAge, headerList.get('x-forwarded-proto'));

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
    return NextResponse.json({ error: 'Session indisponible' }, { status: 503 });
  }
}
