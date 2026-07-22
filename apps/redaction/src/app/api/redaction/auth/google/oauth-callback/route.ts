import { NextResponse } from 'next/server';

import { cookies } from 'next/headers';

import {

  GOOGLE_OAUTH_STATE_COOKIE,

  exchangeGoogleAuthorizationCode,

  getGoogleOAuthClientId,

  getGoogleOAuthClientSecret,

  getGoogleOAuthRedirectUri,

  hashOAuthState,

  redactionPublicUrl,

} from '@/lib/redaction/google-oauth';



type OAuthCallbackParams = {

  code?: string;

  state?: string;

  error?: string;

  errorDescription?: string;

};



function loginRedirect(request: Request, error: string) {

  const login = redactionPublicUrl(request, '/login');

  login.searchParams.set('error', error);

  return NextResponse.redirect(login, { status: 302 });

}



async function completeOAuthCallback(request: Request, params: OAuthCallbackParams) {

  if (params.error) {

    return loginRedirect(request, params.errorDescription || params.error);

  }



  const code = params.code?.trim();

  if (!code) {

    return loginRedirect(request, 'Code Google manquant');

  }



  const state = params.state?.trim() || '';

  const jar = await cookies();

  const expectedHash = jar.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  jar.delete(GOOGLE_OAUTH_STATE_COOKIE);



  if (!state || !expectedHash || hashOAuthState(state) !== expectedHash) {

    return loginRedirect(request, 'Session OAuth invalide — réessayez');

  }



  const clientId = getGoogleOAuthClientId();

  const clientSecret = getGoogleOAuthClientSecret();

  if (!clientId || !clientSecret) {

    return loginRedirect(request, 'Google OAuth non configuré sur la rédaction');

  }



  const redirectUri = getGoogleOAuthRedirectUri(new URL(request.url).origin);

  const exchanged = await exchangeGoogleAuthorizationCode({

    code,

    clientId,

    clientSecret,

    redirectUri,

  });



  if ('error' in exchanged) {

    return loginRedirect(request, exchanged.error);

  }



  const callback = redactionPublicUrl(request, '/auth/google/callback');

  callback.searchParams.set('access_token', exchanged.access_token);

  return NextResponse.redirect(callback, { status: 302 });

}



/**

 * Callback OAuth Google (redirect_uri).

 * GET : legacy (Google peut ajouter `iss=` → bloqué par WAF N0C).

 * POST : prod via `response_mode=form_post` (code dans le corps, pas d’`iss=` dans l’URL).

 */

export async function GET(request: Request) {

  const url = new URL(request.url);

  return completeOAuthCallback(request, {

    code: url.searchParams.get('code') ?? undefined,

    state: url.searchParams.get('state') ?? undefined,

    error: url.searchParams.get('error') ?? undefined,

    errorDescription: url.searchParams.get('error_description') ?? undefined,

  });

}



export async function POST(request: Request) {

  const formData = await request.formData();

  return completeOAuthCallback(request, {

    code: formData.get('code')?.toString(),

    state: formData.get('state')?.toString(),

    error: formData.get('error')?.toString(),

    errorDescription: formData.get('error_description')?.toString(),

  });

}


