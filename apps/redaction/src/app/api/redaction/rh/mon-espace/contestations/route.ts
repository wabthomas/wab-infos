import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { isUuid } from '@/lib/redaction/rh/activities';
import { validateDispute } from '@/lib/redaction/rh/disputes';
import { getMyCollaborator, listMyDisputes, createMyDispute, cancelMyDispute } from '@/lib/redaction/rh/database';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    if (process.env.REDACTION_RH_DISPUTES_ENABLED !== 'true') return json({error:'Contestations désactivées.'},503);
    if (!await getMyCollaborator(principal)) return json({error:'Dossier indisponible.'},403);
    return json({disputes:await listMyDisputes(principal)});
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (process.env.REDACTION_RH_DISPUTES_ENABLED !== 'true') return json({error:'Contestations désactivées.'},503);
    if (!validOrigin(request)) return json({error:'Origine non autorisée.'},403);
    let body: unknown; try { body=await readBody(request); } catch { return json({error:'Requête invalide.'},400); }
    const input=validateDispute(body); if (!input) return json({error:'Vérifiez le sujet et le message.'},400);
    const dispute=await createMyDispute(principal,input);
    if (!dispute) return json({error:'Dossier indisponible.'},409);
    return json({dispute},201);
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (process.env.REDACTION_RH_DISPUTES_ENABLED !== 'true') return json({error:'Contestations désactivées.'},503);
    if (!validOrigin(request)) return json({error:'Origine non autorisée.'},403);
    let body: unknown; try { body=await readBody(request); } catch { return json({error:'Requête invalide.'},400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({error:'Requête invalide.'},400);
    const v=body as Record<string,unknown>;
    if (v.action !== 'cancel' || !isUuid(v.id) || !Number.isSafeInteger(v.version) || Number(v.version)<1) return json({error:'Requête invalide.'},400);
    if (!await cancelMyDispute(principal,v.id,Number(v.version))) return json({error:'Contestation indisponible ou déjà traitée.'},409);
    return json({ok:true});
  } catch (error) { return handleError(error); }
}
