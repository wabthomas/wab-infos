export function paymentHistorySql(columns: string): string {
  return `SELECT ${columns} FROM redaction_rh.withdrawals w
    WHERE w.collaborator_id=(SELECT c.id FROM redaction_rh.collaborators c
      JOIN redaction_rh.account_links l ON l.collaborator_id=c.id
      WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived)
    AND w.status='paid'
    AND ($3::date IS NULL OR w.payment_date >= $3::date)
    AND ($4::date IS NULL OR w.payment_date < $4::date)
    ORDER BY w.payment_date DESC,w.updated_at DESC,w.id DESC LIMIT $5 OFFSET $6`;
}
