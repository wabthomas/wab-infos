import { requireRedactionUser } from '@/lib/redaction/strapi-editor';
import { db } from '@/lib/redaction/rh/database';
import { handleError, json } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

/** Configuration commune à tous les comptes RH, lue par l'APK avec son cookie de session.
 * En cas d'erreur la réponse n'est PAS « autorisé » : le client natif reste protégé. */
export async function GET() {
  try {
    await requireRedactionUser();
    const result = await db().query(
      'SELECT enabled FROM redaction_rh.feature_settings WHERE feature_key=$1',
      ['rhScreenshotsAllowed']
    );
    return json({ allowed: result.rowCount ? result.rows[0].enabled === true : true });
  } catch (error) { return handleError(error); }
}
