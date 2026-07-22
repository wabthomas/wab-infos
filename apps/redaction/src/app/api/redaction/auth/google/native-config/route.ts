import { NextResponse } from 'next/server';
import { getGoogleOAuthClientId, redactionPublicUrl } from '@/lib/redaction/google-oauth';

export async function GET(request: Request) {
  const clientId = getGoogleOAuthClientId();
  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth non configuré (GOOGLE_OAUTH_CLIENT_ID)' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    serverClientId: clientId,
    completeUrl: redactionPublicUrl(request, '/api/redaction/auth/google/native-complete').href,
  });
}
