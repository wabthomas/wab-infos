import { NextRequest, NextResponse } from 'next/server';

/** Force HTTPS en production (cookie Secure + évite « site non sécurisé »). */
export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const proto = request.headers.get('x-forwarded-proto');
  if (proto === 'http') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|sw-redaction.js|firebase-messaging-config.js|icons|uploads).*)',
  ],
};
