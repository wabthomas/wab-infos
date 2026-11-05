import { youtubePerformanceEnabled } from '@/lib/redaction/rh/youtube-performance-server';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { adminYoutubePerformances, reviewYoutubePerformance, setYoutubeBonus } from '@/lib/redaction/rh/youtube-performance-db';
import { isUuid } from '@/lib/redaction/rh/activities';
import { bonusDecision } from '@/lib/redaction/rh/youtube-performance';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!youtubePerformanceEnabled()) return json({ error: 'Module désactivé.' }, 503);
  try { await requireRhPermission('hr_manage'); return json({ performances: await adminYoutubePerformances() }); }
  catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  if (!youtubePerformanceEnabled()) return json({ error: 'Module désactivé.' }, 503);
  try {
    const actor = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const input = body as Record<string, unknown>;
    if (!isUuid(input.id) || !Number.isSafeInteger(input.version) || Number(input.version) < 1) return json({ error: 'Données invalides.' }, 400);
    let ok: boolean;
    if (input.action === 'approve' || input.action === 'reject') {
      if (typeof input.note !== 'string' || input.note.trim().length > 500 || /[\u0000-\u001f\u007f]/.test(input.note) || (input.action === 'reject' && !input.note.trim())) return json({ error: 'Motif obligatoire pour un refus (500 caractères max).' }, 400);
      ok = await reviewYoutubePerformance(input.id, Number(input.version), input.action, input.note.trim(), actor.email);
    } else if (input.action === 'bonus') {
      await requireRhPermission('finance_manage');
      const decision = bonusDecision(input);
      if (!decision) return json({ error: 'Montant en unités minimales et justification obligatoires.' }, 400);
      ok = await setYoutubeBonus(input.id, Number(input.version), decision.amount, decision.currency, decision.note, actor.email);
    } else return json({ error: 'Action invalide.' }, 400);
    if (!ok) return json({ error: 'Prestation non validée, statistiques périmées ou décision modifiée. Actualisez.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
