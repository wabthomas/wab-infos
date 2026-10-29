-- À exécuter une seule fois après les quatre migrations RH précédentes.
BEGIN;
CREATE TABLE redaction_rh.activity_submissions (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  activity_date date NOT NULL,
  description varchar(500) NOT NULL CHECK (length(trim(description)) > 0),
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  decision_note varchar(500) NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX activity_submission_pending_idx ON redaction_rh.activity_submissions (collaborator_id, activity_date) WHERE status = 'pending';
CREATE INDEX activity_submission_person_date_idx ON redaction_rh.activity_submissions (collaborator_id, activity_date DESC);
ALTER TABLE redaction_rh.audit_log ADD COLUMN submission_id uuid REFERENCES redaction_rh.activity_submissions(id);
COMMIT;
