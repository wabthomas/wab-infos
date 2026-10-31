-- Politique RH retenue : conserver les pointages, demandes/corrections et leur historique 5 ans.
-- Exécuter après rh-attendance-corrections.sql ; base RH privée uniquement.
BEGIN;
CREATE OR REPLACE FUNCTION redaction_rh.purge_expired_attendance() RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff_date date := ((now() AT TIME ZONE 'Africa/Kinshasa')::date - interval '5 years')::date;
  deleted_count integer := 0;
  affected integer := 0;
BEGIN
  DELETE FROM redaction_rh.attendance_correction_history WHERE work_date < cutoff_date;
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + affected;
  DELETE FROM redaction_rh.attendance_corrections WHERE work_date < cutoff_date;
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + affected;
  DELETE FROM redaction_rh.attendance WHERE work_date < cutoff_date;
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + affected;
  DELETE FROM redaction_rh.audit_log
   WHERE action IN ('attendance_in','attendance_out','attendance_correction_request','attendance_correction_decision','attendance_correction_admin')
     AND created_at < now() - interval '5 years';
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + affected;
  RETURN deleted_count;
END;
$$;
COMMIT;

-- Planifier mensuellement, avec l'outil d'exploitation du serveur/base :
-- SELECT redaction_rh.purge_expired_attendance();
-- La fonction retourne le nombre total de lignes supprimées. Vérifier et journaliser ce résultat.
