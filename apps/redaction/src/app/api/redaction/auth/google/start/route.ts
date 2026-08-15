import { NextResponse } from 'next/server';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthorizeUrl,
  createOAuthState,
  getGoogleOAuthClientId,
  getGoogleOAuthRedirectUri,
  useGoogleOAuthFormPost,
  googleOAuthStateCookieOptions,
  hashOAuthState,
  redactionPublicUrl,
  resolveRedactionPublicOrigin,
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

  const preferWeb = new URL(request.url).searchParams.get('preferWeb') === '1';
  const formPost = !preferWeb && useGoogleOAuthFormPost();
  const redirectUri = getGoogleOAuthRedirectUri(resolveRedactionPublicOrigin(request));
  const state = createOAuthState();
  const authorizeUrl = buildGoogleAuthorizeUrl({ clientId, redirectUri, state, formPost });

  const response = NextResponse.redirect(authorizeUrl, { status: 302 });
  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    hashOAuthState(state),
    googleOAuthStateCookieOptions(60 * 10, formPost)
  );

  return response;
}
