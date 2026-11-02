export const groupedSql = `WITH entries AS (
  SELECT w.collaborator_id,w.payment_date,w.currency,w.amount_minor,'recorded' AS source FROM redaction_rh.withdrawals w WHERE w.status='paid'
  UNION ALL
  SELECT h.collaborator_id,h.payment_date,h.currency,h.amount_minor,
    CASE WHEN h.status='verified' AND h.matched_withdrawal_id IS NULL THEN 'historical'
         WHEN h.status='verified' THEN 'matched' WHEN h.status='pending' THEN 'pending' ELSE 'excluded' END
    FROM redaction_rh.historical_payments h
)
SELECT to_char(e.payment_date,'YYYY-MM') AS month,c.id AS "collaboratorId",c.first_name AS "firstName",c.last_name AS "lastName",c.team,e.currency,
  COALESCE(SUM(e.amount_minor) FILTER(WHERE e.source='recorded'),0)::text AS "recordedMinor",
  COALESCE(SUM(e.amount_minor) FILTER(WHERE e.source='historical'),0)::text AS "verifiedHistoricalMinor",
  COALESCE(SUM(e.amount_minor) FILTER(WHERE e.source='pending'),0)::text AS "pendingMinor",
  count(*) FILTER(WHERE e.source='matched')::int AS "matchedCount"
FROM entries e JOIN redaction_rh.collaborators c ON c.id=e.collaborator_id
WHERE e.payment_date BETWEEN $1::date AND $2::date AND ($3::text IS NULL OR c.team=$3) AND ($4::uuid IS NULL OR c.id=$4)
GROUP BY to_char(e.payment_date,'YYYY-MM'),c.id,c.first_name,c.last_name,c.team,e.currency
ORDER BY month,c.last_name,c.first_name,c.id,e.currency LIMIT 5001`;

export const detailsSql = `WITH entries AS (
  SELECT w.id,w.collaborator_id,w.payment_date,w.currency,w.amount_minor,w.method,w.payment_reference AS reference,
    'Retrait payé'::text AS kind,'payé enregistré'::text AS status,''::text AS note,''::text AS review_note,
    NULL::text AS verification_source,NULL::uuid AS matched_withdrawal_id,w.created_at AS declared_at,w.updated_at AS reviewed_at,w.requester_email AS declarant_email,NULL::text AS reviewer_email
    FROM redaction_rh.withdrawals w WHERE w.status='paid'
  UNION ALL
  SELECT h.id,h.collaborator_id,h.payment_date,h.currency,h.amount_minor,h.method,h.reference,h.kind,h.status,
    h.note,h.review_note,h.verification_source,h.matched_withdrawal_id,h.created_at,h.reviewed_at,h.declarant_email,h.reviewer_email
    FROM redaction_rh.historical_payments h
)
SELECT to_char(e.payment_date,'YYYY-MM-DD'),c.first_name,c.last_name,c.team,e.currency,e.amount_minor::text,e.kind,e.method,e.status,e.reference,
  e.verification_source,e.matched_withdrawal_id::text,e.note,e.review_note,e.id::text,e.declared_at::text,e.reviewed_at::text,e.declarant_email,e.reviewer_email
FROM entries e JOIN redaction_rh.collaborators c ON c.id=e.collaborator_id
WHERE e.payment_date BETWEEN $1::date AND $2::date AND ($3::text IS NULL OR c.team=$3) AND ($4::uuid IS NULL OR c.id=$4)
ORDER BY e.payment_date,c.last_name,c.id,e.id LIMIT 5001`;

export const eventsSql = `SELECT e.occurred_at::text,to_char(h.payment_date,'YYYY-MM-DD'),c.first_name,c.last_name,c.team,h.currency,h.amount_minor::text,h.id::text,e.actor_email,e.action,h.status,e.note,h.matched_withdrawal_id::text
FROM redaction_rh.historical_payment_events e JOIN redaction_rh.historical_payments h ON h.id=e.payment_id
JOIN redaction_rh.collaborators c ON c.id=h.collaborator_id
WHERE h.payment_date BETWEEN $1::date AND $2::date AND ($3::text IS NULL OR c.team=$3) AND ($4::uuid IS NULL OR c.id=$4)
ORDER BY e.occurred_at,e.id LIMIT 5001`;
