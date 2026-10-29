import 'server-only';
import { getRedactionJwt, requireRedactionUser, RedactionAuthError } from '@/lib/redaction/strapi-editor';
import { getStrapiUrl } from '@/lib/redaction/config';
import { parseRhPrincipal, type RhPrincipal } from './principal';

/** Seuls les comptes Users & Permissions sont pris en charge pour le moment.
 * Le JWT est revérifié et le blocage, la confirmation, l'id et l'e-mail contrôlés. */
export async function requireRhPrincipal(): Promise<RhPrincipal> {
  const user = await requireRedactionUser();
  const jwt = await getRedactionJwt();
  if (!jwt) throw new RedactionAuthError('Non connecté');
  const res = await fetch(`${getStrapiUrl()}/api/users/me`, { headers: { Authorization: `Bearer ${jwt}` }, cache: 'no-store' });
  if (!res.ok) throw new RedactionAuthError('Compte RH indisponible');
  const principal = parseRhPrincipal(await res.json());
  if (!principal || principal.id !== user.id || principal.email !== user.email.toLowerCase()) throw new RedactionAuthError('Compte RH indisponible');
  return principal;
}

/** Recherche uniquement à la demande d'un administrateur, via un jeton serveur. */
export async function lookupRhAccount(id: number): Promise<(RhPrincipal & { username: string }) | null> {
  const token = process.env.STRAPI_API_TOKEN;
  if (!token) throw new Error('Strapi token missing');
  const res = await fetch(`${getStrapiUrl()}/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Account lookup failed');
  const data = await res.json();
  const principal = parseRhPrincipal(data);
  if (!principal || principal.id !== id || typeof data.username !== 'string') return null;
  return { ...principal, username: data.username };
}
