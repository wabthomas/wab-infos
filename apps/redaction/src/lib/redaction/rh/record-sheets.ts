import { isValidDate, isUuid, kinshasaToday } from './activities';

export type SheetType = 'presence' | 'prestations' | 'paiements';
export type SheetFilter = { type: SheetType; start: string; end: string; collaboratorId: string | null };

/** Une fiche datée est bornée à un an ; aucune liste récente tronquée n'est réutilisée. */
export function parseSheetFilter(value: unknown): SheetFilter | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.type !== 'presence' && v.type !== 'prestations' && v.type !== 'paiements') return null;
  if (!isValidDate(v.start) || !isValidDate(v.end) || v.start > v.end || v.end > kinshasaToday() ||
    (Date.parse(v.end) - Date.parse(v.start)) / 86400000 > 366 ||
    (v.collaboratorId !== undefined && v.collaboratorId !== null && !isUuid(v.collaboratorId))) return null;
  return { type: v.type, start: v.start, end: v.end, collaboratorId: typeof v.collaboratorId === 'string' ? v.collaboratorId : null };
}

export type SheetRow = { date: string; category: string; details: string; status: string; currency: string | null; amountMinor: string | null; reference: string | null; id: string };

export const sheetQueries: Record<SheetType, string> = {
  presence: `SELECT to_char(work_date,'YYYY-MM-DD') AS date,'Pointage'::text AS category,
    concat_ws(' / ',CASE WHEN check_in IS NOT NULL THEN 'Arrivée ' || to_char(check_in AT TIME ZONE 'Africa/Kinshasa','HH24:MI') END,
      CASE WHEN check_out IS NOT NULL THEN 'Départ ' || to_char(check_out AT TIME ZONE 'Africa/Kinshasa','HH24:MI') END,note) AS details,
    CASE WHEN check_in IS NOT NULL AND check_out IS NOT NULL THEN 'Complet' ELSE 'Partiel' END AS status,
    NULL::text AS currency,NULL::text AS "amountMinor",NULL::text AS reference,id::text
    FROM redaction_rh.attendance WHERE collaborator_id=$1 AND work_date BETWEEN $2::date AND $3::date
    ORDER BY work_date,id LIMIT 5001`,
  prestations: `SELECT to_char(activity_date,'YYYY-MM-DD') AS date,'Relevé'::text AS category,description AS details,
    CASE status WHEN 'effectuee' THEN 'Effectuée' WHEN 'absence_signalee' THEN 'Absence signalée' ELSE 'Absence justifiée' END AS status,
    NULL::text AS currency,NULL::text AS "amountMinor",NULL::text AS reference,id::text
    FROM redaction_rh.daily_activities WHERE collaborator_id=$1 AND activity_date BETWEEN $2::date AND $3::date
    UNION ALL
    SELECT to_char(activity_date,'YYYY-MM-DD'),'Déclaration'::text,description,
    CASE status WHEN 'pending' THEN 'À vérifier' WHEN 'approved' THEN 'Validée' WHEN 'rejected' THEN 'Refusée' ELSE 'Annulée' END,
    NULL::text,NULL::text,NULL::text,id::text
    FROM redaction_rh.activity_submissions WHERE collaborator_id=$1 AND activity_date BETWEEN $2::date AND $3::date
    ORDER BY date,id LIMIT 5001`,
  paiements: `SELECT to_char(payment_date,'YYYY-MM-DD') AS date,'Retrait payé'::text AS category,method::text AS details,
    'Enregistré'::text AS status,currency::text,amount_minor::text AS "amountMinor",payment_reference::text AS reference,id::text
    FROM redaction_rh.withdrawals WHERE collaborator_id=$1 AND status='paid' AND payment_date BETWEEN $2::date AND $3::date
    UNION ALL
    SELECT to_char(payment_date,'YYYY-MM-DD'),'Déclaration ancienne'::text,kind || ' / ' || method,
    CASE WHEN status='verified' AND matched_withdrawal_id IS NOT NULL THEN 'Vérifié · déjà enregistré'
      WHEN status='verified' THEN 'Vérifié · complément' WHEN status='pending' THEN 'À vérifier'
      WHEN status='rejected' THEN 'Refusé' ELSE 'Annulé' END,
    currency::text,amount_minor::text,reference::text,id::text
    FROM redaction_rh.historical_payments WHERE collaborator_id=$1 AND payment_date BETWEEN $2::date AND $3::date
    ORDER BY date,id LIMIT 5001`,
};
