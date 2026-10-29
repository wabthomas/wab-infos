-- Exécuter après rh-initial.sql dans la base RH privée.
BEGIN;
CREATE TABLE redaction_rh.report_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_email varchar(320) NOT NULL,
  report_type varchar(24) NOT NULL CHECK (report_type IN ('collaborateurs','absences','prestations')),
  row_count integer NOT NULL CHECK (row_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
