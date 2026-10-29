-- À exécuter une seule fois après rh-initial.sql, par le propriétaire de la base RH.
BEGIN;
CREATE TABLE redaction_rh.daily_activities (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  activity_date date NOT NULL,
  status varchar(30) NOT NULL CHECK (status IN ('effectuee', 'absence_signalee', 'absence_justifiee')),
  description varchar(500) NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collaborator_id, activity_date)
);
ALTER TABLE redaction_rh.audit_log ADD COLUMN activity_id uuid REFERENCES redaction_rh.daily_activities(id);
CREATE INDEX daily_activities_date_idx ON redaction_rh.daily_activities (activity_date, collaborator_id);
COMMIT;
