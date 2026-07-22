import { NextResponse } from 'next/server';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthorizeUrl,
  createOAuthState,
  getGoogleOAuthClientId,
  getGoogleOAuthRedirectUri,
  googleOAuthStateCookieOptions,
  hashOAuthState,
  redactionPublicUrl,
} from '@/lib/redaction/google-oauth';

/**
 * Démarre OAuth Google directement depuis l’app rédaction.
 * Évite le callback CMS bloqué en 403 par LiteSpeed quand Google ajoute `iss=`.
 */
export async function GET(request: Request) {
  const clientId = getGoogleOAuthClientId();
  if (!clientId) {
    const login = redactionPublicUrl(request, '/login');
    login.searchParams.set('error', 'Google OAuth non configuré (GOOGLE_OAUTH_CLIENT_ID)');
    return NextResponse.redirect(login, { status: 302 });
  }

  const redirectUri = getGoogleOAuthRedirectUri(new URL(request.url).origin);
  const state = createOAuthState();
  const authorizeUrl = buildGoogleAuthorizeUrl({ clientId, redirectUri, state });

  const response = NextResponse.redirect(authorizeUrl, { status: 302 });
  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    hashOAuthState(state),
    googleOAuthStateCookieOptions()
  );

  return response;
}
