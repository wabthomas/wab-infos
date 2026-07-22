import { NextResponse } from 'next/server';
import { createRedactionGoogleSession } from '@/lib/redaction/google-auth-session';
import {
  exchangeGoogleAuthorizationCode,
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
  redactionPublicUrl,
} from '@/lib/redaction/google-oauth';
import { RedactionAuthError } from '@/lib/redaction/strapi-editor';

function loginRedirect(request: Request, error: string) {
  const login = redactionPublicUrl(request, '/login');
  login.searchParams.set('error', error);
  return NextResponse.redirect(login, { status: 302 });
}

/**
 * Finalise la connexion Google native Android depuis le WebView.
 * Le code vient du sélecteur de comptes Google natif, sans passage visible par le navigateur externe.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code')?.trim();
  if (!code) {
    return loginRedirect(request, 'Code Google manquant');
  }

  const remember = url.searchParams.get('remember') !== '0';
  const clientId = getGoogleOAuthClientId();
  const clientSecret = getGoogleOAuthClientSecret();
  if (!clientId || !clientSecret) {
    return loginRedirect(request, 'Google OAuth non configuré sur la rédaction');
  }

  try {
    const exchanged = await exchangeGoogleAuthorizationCode({
      code,
      clientId,
      clientSecret,
      redirectUri: '',
    });

    if ('error' in exchanged) {
      return loginRedirect(request, exchanged.error);
    }

    await createRedactionGoogleSession(request, exchanged.access_token, remember);
    return NextResponse.redirect(redactionPublicUrl(request, '/'), { status: 302 });
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return loginRedirect(request, error.message);
    }
    console.error('[redaction/auth/google/native-complete]', error);
    return loginRedirect(request, 'Connexion Google impossible');
  }
}
