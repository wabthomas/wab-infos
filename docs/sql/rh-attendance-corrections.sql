-- Exécuter après rh-payouts-attendance.sql, rh-roles.sql et rh-notifications.sql dans la base RH privée.
BEGIN;
CREATE TABLE redaction_rh.attendance_corrections (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  work_date date NOT NULL,
  requested_check_in time,
  requested_check_out time,
  reason varchar(500) NOT NULL CHECK (length(trim(reason)) BETWEEN 8 AND 500),
  source varchar(12) NOT NULL CHECK (source IN ('employee','admin')),
  status varchar(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by_email varchar(320) NOT NULL,
  decision_note varchar(500) NOT NULL DEFAULT '',
  decided_by_email varchar(320),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (requested_check_in IS NOT NULL OR requested_check_out IS NOT NULL),
  CHECK (requested_check_in IS NULL OR requested_check_out IS NULL OR requested_check_out >= requested_check_in),
  CHECK ((status='pending' AND decided_at IS NULL AND decided_by_email IS NULL) OR (status<>'pending' AND decided_at IS NOT NULL AND decided_by_email IS NOT NULL))
);
CREATE UNIQUE INDEX attendance_correction_one_pending_per_day_idx
  ON redaction_rh.attendance_corrections (collaborator_id, work_date) WHERE status='pending';
CREATE INDEX attendance_corrections_recent_idx
  ON redaction_rh.attendance_corrections (status, work_date DESC, created_at DESC);

CREATE TABLE redaction_rh.attendance_correction_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  correction_id uuid NOT NULL REFERENCES redaction_rh.attendance_corrections(id),
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  work_date date NOT NULL,
  before_check_in timestamptz,
  after_check_in timestamptz NOT NULL,
  before_check_out timestamptz,
  after_check_out timestamptz,
  reason varchar(500) NOT NULL,
  actor_email varchar(320) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attendance_correction_history_person_idx
  ON redaction_rh.attendance_correction_history (collaborator_id, work_date DESC, id DESC);
ALTER TABLE redaction_rh.notifications
  DROP CONSTRAINT IF EXISTS notifications_event_type_check;
ALTER TABLE redaction_rh.notifications
  ADD CONSTRAINT notifications_event_type_check
  CHECK (event_type IN ('absence','prestation','remuneration','retrait','service_card','attendance_correction'));
COMMIT;
