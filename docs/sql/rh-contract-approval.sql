-- Appliquer après rh-contract-workflow.sql, rh-contract-parties.sql et rh-contract-signing-place.sql, AVANT le déploiement.
-- Sauvegarder la base. Les PDF précédemment acceptés ne sont jamais régénérés.
BEGIN;
ALTER TABLE redaction_rh.contract_cases ADD COLUMN IF NOT EXISTS consent_company_rules boolean NOT NULL DEFAULT false;
ALTER TABLE redaction_rh.contract_cases ADD COLUMN IF NOT EXISTS consent_work_rules boolean NOT NULL DEFAULT false;
ALTER TABLE redaction_rh.contract_cases ADD COLUMN IF NOT EXISTS consent_snapshot jsonb;
ALTER TABLE redaction_rh.contract_cases ADD COLUMN IF NOT EXISTS signature_mode varchar(8);
ALTER TABLE redaction_rh.contract_cases ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE redaction_rh.contract_cases ADD COLUMN IF NOT EXISTS approved_by varchar(320);
ALTER TABLE redaction_rh.contract_cases ALTER COLUMN status TYPE varchar(20);
ALTER TABLE redaction_rh.contract_cases DROP CONSTRAINT IF EXISTS contract_cases_status_check;
ALTER TABLE redaction_rh.contract_cases ADD CONSTRAINT contract_cases_status_check CHECK(status IN ('draft','proposed','pending_approval','accepted','declined','archived'));
-- Garder la contrainte historique de signature si elle existe ; les contrats 'pending_approval' sont aussi vérifiés ci-dessous.
ALTER TABLE redaction_rh.contract_cases ADD CONSTRAINT contract_cases_pending_approval_check
  CHECK(status <> 'pending_approval' OR (employee_signature IS NOT NULL AND employee_signature_bytes IS NOT NULL
    AND employee_account_id IS NOT NULL AND employee_account_email IS NOT NULL AND accepted_at IS NOT NULL
    AND pdf_bytes IS NOT NULL AND pdf_sha256 IS NOT NULL AND consent_company_rules AND consent_work_rules));
ALTER TABLE redaction_rh.contract_case_events DROP CONSTRAINT IF EXISTS contract_case_events_action_check;
ALTER TABLE redaction_rh.contract_case_events ADD CONSTRAINT contract_case_events_action_check
  CHECK(action IN ('create','update','propose','accept','sign','approve','decline','archive','download'));
-- Les rappels sont dédupliqués par échéance (60, 30, 7 jours et jour du terme).
CREATE TABLE IF NOT EXISTS redaction_rh.contract_reminders (
  contract_id uuid NOT NULL REFERENCES redaction_rh.contract_cases(id),
  days_before smallint NOT NULL CHECK(days_before IN (60,30,7,0)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(contract_id,days_before)
);
COMMIT;
