// Keep the same cutoff for the count and each page. IDs are monotonic and
// provide a deterministic tie-breaker even when timestamps are identical.
export const auditCountSql = `SELECT COUNT(*)::text AS total
  FROM redaction_rh.audit_log a WHERE a.id <= $1::bigint`;

export const auditPageSql = `SELECT a.id::text AS id, a.actor_email AS "actorEmail",
    a.action, a.collaborator_id AS "collaboratorId",
    a.created_at AS "createdAt", c.first_name AS "firstName", c.last_name AS "lastName"
  FROM redaction_rh.audit_log a
  LEFT JOIN redaction_rh.collaborators c ON c.id = a.collaborator_id
  WHERE a.id <= $1::bigint
  ORDER BY a.id DESC
  LIMIT $2 OFFSET $3`;
