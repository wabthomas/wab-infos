import { NextResponse } from 'next/server';
import { isAllowedRedactionOrigin } from '@wab-infos/shared';
import { createRedactionGoogleSession } from '@/lib/redaction/google-auth-session';
import {
  exchangeGoogleAuthorizationCode,
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
} from '@/lib/redaction/google-oauth';
import { RedactionAuthError } from '@/lib/redaction/strapi-editor';

/**
 * Échange un code Google (popup GIS, `redirect_uri=postmessage`) sans passer
 * par le callback redirect — le WAF N0C bloque `iss=accounts.google.com`.
 */
export async function POST(request: Request) {
  const origin = (request.headers.get('origin') || '').replace(/\/$/, '');
  if (origin && !isAllowedRedactionOrigin(origin)) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
  }

  let body: { code?: string; remember?: boolean };
  try {
    body = (await request.json()) as { code?: string; remember?: boolean };
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const code = body.code?.trim() ?? '';
  if (!code) {
    return NextResponse.json({ error: 'Code Google manquant' }, { status: 400 });
  }

  const clientId = getGoogleOAuthClientId();
  const clientSecret = getGoogleOAuthClientSecret();
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Google OAuth non configuré' }, { status: 503 });
  }

  const exchanged = await exchangeGoogleAuthorizationCode({
    code,
    clientId,
    clientSecret,
    redirectUri: 'postmessage',
  });

  if ('error' in exchanged) {
    return NextResponse.json({ error: exchanged.error }, { status: 401 });
  }

  try {
    const remember = body.remember !== false;
    const { user } = await createRedactionGoogleSession(request, exchanged.access_token, remember);
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[redaction/auth/google/code]', err);
    return NextResponse.json({ error: 'Connexion Google impossible' }, { status: 503 });
  }
}
