export interface RhPrincipal { id: number; email: string }
/** Échec fermé si Strapi ne confirme pas explicitement l'état du compte. */
export function parseRhPrincipal(value: unknown): RhPrincipal | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!Number.isSafeInteger(v.id) || Number(v.id) <= 0 || Number(v.id) > 2147483647 || typeof v.email !== 'string' || v.email.length > 320 || v.blocked !== false || v.confirmed !== true) return null;
  const email = v.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { id: Number(v.id), email };
}
