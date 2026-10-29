import 'server-only';
import { requireRedactionUser, isRedactionSuperAdmin } from '@/lib/redaction/strapi-editor';
import { requireRhPrincipal } from './identity';
import { getRhRoles } from './database';
import { allowsRhPermission, capabilitiesForRoles, type RhCapabilities, type RhPermission } from './permissions';
export class RhForbidden extends Error {}
export async function getRhCapabilities(): Promise<RhCapabilities> {
  const user = await requireRedactionUser();
  if (isRedactionSuperAdmin(user)) return capabilitiesForRoles(true, []);
  if (process.env.REDACTION_RH_ROLES_ENABLED !== 'true') return capabilitiesForRoles(false, []);
  const principal = await requireRhPrincipal();
  return capabilitiesForRoles(false, await getRhRoles(principal));
}
export async function requireRhPermission(permission: RhPermission) {
  const user = await requireRedactionUser();
  if (!allowsRhPermission(await getRhCapabilities(), permission)) throw new RhForbidden('Accès RH refusé');
  return user;
}
