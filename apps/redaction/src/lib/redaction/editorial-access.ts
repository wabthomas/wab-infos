import 'server-only';
import { redirect } from 'next/navigation';
import { requireRedactionUser, isRedactionSuperAdmin, RedactionAuthError } from '@/lib/redaction/strapi-editor';
import type { RedactionUser } from '@/lib/redaction/types';
import { db } from '@/lib/redaction/rh/database';
import { isRhOnlyJobTitle } from '@/lib/redaction/rh/collaborator';

/** True when the account is linked to a collaborator with a RH-only function. */
export async function isRhOnlyUser(user: Pick<RedactionUser, 'id' | 'email'>): Promise<boolean> {
  // No RH DB means there cannot be a linked RH profile to evaluate in this deployment.
  if (!process.env.REDACTION_RH_DATABASE_URL) return false;
  try {
    const result = await db().query(
      `SELECT c.job_title AS "jobTitle"
       FROM redaction_rh.collaborators c
       JOIN redaction_rh.account_links l ON l.collaborator_id=c.id
       WHERE l.account_id=$1 AND lower(l.account_email)=lower($2) AND NOT c.archived`,
      [user.id, user.email],
    );
    return result.rows.some((row) => typeof row.jobTitle === 'string' && isRhOnlyJobTitle(row.jobTitle));
  } catch {
    // Fail closed when a configured RH database cannot confirm editorial eligibility.
    throw new RedactionAuthError('Impossible de vérifier les accès RH de ce compte. Réessayez plus tard.');
  }
}

/** Guard for all editorial pages and APIs; RH-only collaborators remain authenticated for RH routes. */
export async function requireEditorialUser(): Promise<RedactionUser> {
  const user = await requireRedactionUser();
  if (await isRhOnlyUser(user)) throw new RedactionAuthError('Ce compte a accès uniquement à l’espace RH.');
  return user;
}

export async function requireEditorialPageUser(): Promise<RedactionUser> {
  let user: RedactionUser;
  try {
    user = await requireRedactionUser();
  } catch {
    redirect('/login');
  }
  if (await isRhOnlyUser(user)) redirect('/mon-rh');
  return user;
}

export async function requireEditorialSuperAdmin(): Promise<RedactionUser> {
  const user = await requireEditorialUser();
  if (!isRedactionSuperAdmin(user)) throw new RedactionAuthError('Accès réservé aux administrateurs rédaction.');
  return user;
}
