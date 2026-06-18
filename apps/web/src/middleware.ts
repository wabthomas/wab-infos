import { NextRequest, NextResponse } from 'next/server';

const WP_REDIRECTS: Record<string, string> = {
  // Ajouter les redirections WordPress ici après l'import
  // '/ancien-slug': '/nouvelle-rubrique/nouveau-slug',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirections 301 WordPress
  if (WP_REDIRECTS[pathname]) {
    return NextResponse.redirect(new URL(WP_REDIRECTS[pathname], request.url), 301);
  }

  // Ancien format WordPress : /?p=123 → géré par le script d'import via canonicalUrl
  // Ancien format : /category/article-slug/ (trailing slash)
  if (pathname.endsWith('/') && pathname.length > 1) {
    return NextResponse.redirect(
      new URL(pathname.slice(0, -1), request.url),
      301
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|uploads|api).*)',
  ],
};
