import 'server-only';
import { requireRedactionUser, isRedactionSuperAdmin } from '@/lib/redaction/strapi-editor';
import { requireRhPrincipal } from './identity';
import { getRhRoles } from './database';
import { getRhFlags } from './flags';
import { allowsRhPermission, capabilitiesForRoles, type RhCapabilities, type RhPermission } from './permissions';
export class RhForbidden extends Error {}
export async function getRhCapabilities(): Promise<RhCapabilities> {
  const user = await requireRedactionUser();
  if (isRedactionSuperAdmin(user)) return capabilitiesForRoles(true, []);
  const flags = await getRhFlags();
  if (!flags.rolesEnabled) return capabilitiesForRoles(false, []);
  const principal = await requireRhPrincipal();
  return capabilitiesForRoles(false, await getRhRoles(principal));
}
export async function requireRhPermission(permission: RhPermission) {
  const user = await requireRedactionUser();
  const flags = await getRhFlags();
  if (permission !== 'access_manage' && !flags.rhEnabled) throw new RhForbidden('Espace RH désactivé');
  if ((permission === 'finance_manage' || permission === 'finance_read') && !flags.financeEnabled) throw new RhForbidden('Gestion financière désactivée');
  if (!allowsRhPermission(await getRhCapabilities(), permission)) throw new RhForbidden('Accès RH refusé');
  return user;
}
