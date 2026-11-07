-- Index pour les écrans RH les plus consultés (idempotent).
CREATE INDEX IF NOT EXISTS activity_submission_person_created_idx
  ON redaction_rh.activity_submissions (collaborator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contract_cases_status_idx
  ON redaction_rh.contract_cases (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_created_idx
  ON redaction_rh.audit_log (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS account_links_collaborator_idx
  ON redaction_rh.account_links (collaborator_id);
