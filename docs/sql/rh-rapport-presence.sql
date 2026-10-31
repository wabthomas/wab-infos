-- À exécuter après rh-rapports.sql dans la base RH privée.
-- Autorise et journalise les exports de pointage via le rapport RH existant.
BEGIN;
ALTER TABLE redaction_rh.report_audit
  DROP CONSTRAINT IF EXISTS report_audit_report_type_check;
ALTER TABLE redaction_rh.report_audit
  ADD CONSTRAINT report_audit_report_type_check
  CHECK (report_type IN ('collaborateurs','absences','prestations','presence'));
COMMIT;
