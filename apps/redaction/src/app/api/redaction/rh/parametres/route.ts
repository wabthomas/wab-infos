import { requireRedactionSuperAdmin } from '@/lib/redaction/strapi-editor';
import { getRhFlags, RH_FEATURE_LABELS, type RhFeatureKey } from '@/lib/redaction/rh/flags';
import { db } from '@/lib/redaction/rh/database';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
import { notifyEditorsByEmail } from '@/lib/redaction/web-push';

export const dynamic = 'force-dynamic';
const keys = Object.keys(RH_FEATURE_LABELS) as RhFeatureKey[];

export async function GET() {
  try {
    await requireRedactionSuperAdmin();
    return json({ settings: await getRhFlags(), labels: RH_FEATURE_LABELS });
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireRedactionSuperAdmin();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const settings = (body as Record<string, unknown>).settings;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return json({ error: 'Paramètres invalides.' }, 400);
    const entries = Object.entries(settings as Record<string, unknown>);
    if (!entries.length || entries.some(([key, value]) => !keys.includes(key as RhFeatureKey) || typeof value !== 'boolean'))
      return json({ error: 'Une fonctionnalité ou valeur est invalide.' }, 400);

    const defaults = await getRhFlags();
    const changed: Array<{ key: RhFeatureKey; enabled: boolean }> = [];
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      const before = await client.query<{ feature_key: RhFeatureKey; enabled: boolean }>(
        'SELECT feature_key,enabled FROM redaction_rh.feature_settings WHERE feature_key=ANY($1::varchar[]) FOR UPDATE',
        [entries.map(([key]) => key)]
      );
      const previous = new Map(before.rows.map(row => [row.feature_key, row.enabled]));
      for (const [key, value] of entries) {
        const name = key as RhFeatureKey;
        if ((previous.get(name) ?? defaults[name]) !== value) changed.push({ key: name, enabled: value as boolean });
        await client.query(`INSERT INTO redaction_rh.feature_settings(feature_key,enabled,updated_by) VALUES($1,$2,$3)
          ON CONFLICT(feature_key) DO UPDATE SET enabled=EXCLUDED.enabled,updated_by=EXCLUDED.updated_by,updated_at=now()`,
          [name, value, admin.email]);
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }

    // Un changement réellement enregistré seulement ; aucune panne push ne bloque le réglage.
    if (changed.length) {
      try {
        const recipients = await db().query<{ account_email: string }>(`SELECT DISTINCT l.account_email
          FROM redaction_rh.account_links l JOIN redaction_rh.collaborators c ON c.id=l.collaborator_id
          WHERE NOT c.archived AND l.account_email IS NOT NULL`);
        const emails = recipients.rows.map(row => row.account_email);
        for (const item of changed) {
          const label = RH_FEATURE_LABELS[item.key];
          const body = item.key === 'rhScreenshotsAllowed'
            ? `Captures d’écran dans l’espace RH : ${item.enabled ? 'autorisées' : 'interdites'} dans la nouvelle APK.`
            : `${label} : ${item.enabled ? 'activé' : 'désactivé'}.`;
          const result = await notifyEditorsByEmail(emails, { title: 'Fonctionnalité RH mise à jour', body, url: '/mon-rh' });
          if (result.failed) console.warn('[rh] push de paramètre non livrées', result.failed);
        }
      } catch (error) {
        console.warn('[rh] push de paramètre indisponible', error instanceof Error ? error.name : 'erreur');
      }
    }
    return json({ settings: await getRhFlags() });
  } catch (error) { return handleError(error); }
}
