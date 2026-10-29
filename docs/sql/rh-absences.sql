-- À exécuter une seule fois après rh-initial.sql et rh-prestations.sql.
BEGIN;
CREATE TABLE redaction_rh.absence_requests (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  category varchar(100) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  decision_note varchar(500) NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE redaction_rh.audit_log ADD COLUMN absence_id uuid REFERENCES redaction_rh.absence_requests(id);
CREATE INDEX absence_requests_collaborator_dates_idx ON redaction_rh.absence_requests (collaborator_id, start_date, end_date);
COMMIT;
