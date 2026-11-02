export const insertRecordSheetPdfSql = `INSERT INTO redaction_rh.record_sheet_pdf_links(token_hash,export_id,actor_email,collaborator_id,sheet_type,pdf_bytes,expires_at)
        SELECT $1,e.id,e.actor_email,e.collaborator_id,e.sheet_type,$2,now()+interval '10 minutes'
        FROM redaction_rh.record_sheet_exports e
        WHERE e.id=$3 AND e.actor_email=$4 AND e.sheet_type=$5 AND e.created_at > now()-interval '10 minutes'
          AND ($6::uuid IS NULL OR e.collaborator_id=$6)
          AND ($6::uuid IS NOT NULL OR EXISTS (
            SELECT 1 FROM redaction_rh.account_links l JOIN redaction_rh.collaborators c ON c.id=l.collaborator_id
            WHERE l.collaborator_id=e.collaborator_id AND l.account_id=$7 AND l.account_email=$4 AND NOT c.archived))
        ON CONFLICT (export_id) DO NOTHING RETURNING export_id`;
