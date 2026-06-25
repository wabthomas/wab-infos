import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  REDACTION_COOKIE,
  REDACTION_COOKIE_MAX_AGE,
} from '@/lib/redaction/config';
import { RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export async function POST() {
  try {
    const user = await requireRedactionUser();
    const jar = await cookies();
    const jwt = jar.get(REDACTION_COOKIE)?.value;
    if (!jwt) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    }

    jar.set(REDACTION_COOKIE, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REDACTION_COOKIE_MAX_AGE,
    });

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Session indisponible' }, { status: 503 });
  }
}
