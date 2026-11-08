import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { getEmailSettingsView, saveEmailSettings, sendEmailSettingsTest, validateEmailSettings } from '@/lib/redaction/rh/email-settings';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRhPermission('access_manage');
    return json({ settings: await getEmailSettingsView() });
  } catch (error) { return handleError(error); }
}

export async function PUT(request: Request) {
  try {
    const user = await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateEmailSettings(body);
    if (!input) return json({ error: 'Vérifiez l’hôte, le port, l’adresse expéditrice et les champs SMTP.' }, 400);
    const settings = await saveEmailSettings(input, user.email);
    return json({ settings });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const to = typeof (body as { to?: unknown })?.to === 'string' ? String((body as { to: string }).to).trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return json({ error: 'Adresse de test invalide.' }, 400);
    const result = await sendEmailSettingsTest(to);
    if (!result.ok) return json({ error: result.error || 'Envoi de test impossible.' }, 502);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
