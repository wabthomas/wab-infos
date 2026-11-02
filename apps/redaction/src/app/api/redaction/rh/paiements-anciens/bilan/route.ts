import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { getPaymentReport, parsePaymentReportFilter } from '@/lib/redaction/rh/historical-payment-report';
import { makeCsv } from '@/lib/redaction/rh/reports';
import { handleError, json, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireRhPermission('finance_read');
    const filter = parsePaymentReportFilter(new URL(request.url).searchParams);
    if (!filter) return json({ error: 'Dates ou équipe invalides.' }, 400);
    const report = await getPaymentReport(filter);
    if (!report) return json({ error: 'Plus de 5 000 lignes : réduisez la période ou filtrez par équipe.' }, 413);
    return json(report);
  } catch(error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const actor = await requireRhPermission('finance_read');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    const params = new URL(request.url).searchParams;
    const filter = parsePaymentReportFilter(params);
    const mode = params.get('mode');
    if (!filter || (mode !== 'summary' && mode !== 'detail' && mode !== 'events')) return json({ error: 'Filtres ou format invalides.' },400);
    const report = await getPaymentReport(filter,mode,actor.email);
    if (!report) return json({ error: 'Plus de 5 000 lignes : réduisez la période ou filtrez par équipe.' },413);
    const headers = mode === 'events'
      ? ['Date événement','Date paiement','Prénom','Nom','Équipe actuelle','Devise','Montant en centimes','Identifiant','Acteur','Action','Statut actuel','Motif','Retrait rapproché actuel']
      : mode === 'detail'
      ? ['Date paiement','Prénom','Nom','Équipe actuelle','Devise','Montant en centimes','Nature','Moyen','Statut','Référence','Source vérification','Retrait rapproché','Note déclarant','Motif contrôle','Identifiant','Saisi le','Vérifié le','Déclarant','Contrôlé par']
      : ['Période','Devise','Enregistré en centimes','Historique vérifié en centimes','Total vérifié en centimes','Déclaré à vérifier en centimes','Rapprochés sans double compte'];
    const rows = mode === 'events' ? report.events ?? [] : mode === 'detail' ? report.detail ?? [] : [
      ...report.monthly.map(r=>[r.period,r.currency,r.recordedMinor,r.verifiedHistoricalMinor,r.totalVerifiedMinor,r.pendingMinor,r.matchedCount]),
      ...report.yearly.map(r=>[`Année ${r.period}`,r.currency,r.recordedMinor,r.verifiedHistoricalMinor,r.totalVerifiedMinor,r.pendingMinor,r.matchedCount]),
    ];
    return new Response(makeCsv(headers,rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="rh-paiements-${mode}-${filter.start}-${filter.end}.csv"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  } catch(error) { return handleError(error); }
}
