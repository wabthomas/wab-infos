/**
 * Redirige les pages d'authentification Strapi par défaut vers la page Wab-infos.
 */
function getPublicSiteUrl(): string {
  if (typeof window === 'undefined') return 'https://app.wab-infos.com';

  const { protocol, hostname } = window.location;
  if (hostname.startsWith('cms.')) {
    return `${protocol}//${hostname.replace(/^cms\./, 'app.')}`;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  return 'https://app.wab-infos.com';
}

export function redirectToWabAdminLogin(): void {
  if (typeof window === 'undefined') return;

  const { pathname, search } = window.location;
  const isStrapiAuth =
    pathname === '/admin/auth/login' ||
    pathname === '/admin/auth/register' ||
    pathname.startsWith('/admin/auth/login/');

  if (!isStrapiAuth) return;

  const params = new URLSearchParams(search);
  const redirectTo = params.get('redirectTo') || '/admin';

  const loginUrl = new URL('/wab-admin-login.html', window.location.origin);
  loginUrl.searchParams.set('redirect', redirectTo);
  loginUrl.searchParams.set('site', getPublicSiteUrl());

  window.location.replace(loginUrl.toString());
}
