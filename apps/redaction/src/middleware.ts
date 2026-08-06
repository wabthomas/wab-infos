import { NextRequest, NextResponse } from 'next/server';
import { joinRedactionPublicPath, redactionBasePathFromPublicUrl } from '@wab-infos/shared';

/** Force HTTPS en production (cookie Secure + évite « site non sécurisé »). */
export function middleware(request: NextRequest) {
  const canonicalPublic = (
    process.env.NEXT_PUBLIC_REDACTION_URL ||
    process.env.REDACTION_APP_URL ||
    ''
  )
    .trim()
    .replace(/\/$/, '');

  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? '';

  // Sous-domaine legacy → URL canonique sur le domaine principal (WiFi / DNS filtrés).
  if (canonicalPublic && host.startsWith('redaction.app.')) {
    try {
      const canonicalHost = new URL(canonicalPublic).hostname.toLowerCase();
      if (canonicalHost !== host) {
        const pathname = request.nextUrl.pathname;
        const basePath = redactionBasePathFromPublicUrl(canonicalPublic);
        const rel =
          basePath && pathname.startsWith(basePath)
            ? pathname.slice(basePath.length) || '/'
            : pathname;
        const target = new URL(joinRedactionPublicPath(canonicalPublic, rel));
        target.search = request.nextUrl.search;
        return NextResponse.redirect(target, 308);
      }
    } catch {
      // ignore
    }
  }

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
