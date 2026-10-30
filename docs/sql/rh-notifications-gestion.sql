-- Après rh-initial.sql, pour la base RH privée ; à exécuter une seule fois.
BEGIN;
CREATE TABLE redaction_rh.management_events (
  id uuid PRIMARY KEY,
  event_type varchar(20) NOT NULL CHECK (event_type IN ('prestation','absence','retrait','contestation')),
  source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type,source_id)
);
CREATE INDEX management_events_recent_idx ON redaction_rh.management_events (created_at DESC,id);
CREATE TABLE redaction_rh.management_event_reads (
  event_id uuid NOT NULL REFERENCES redaction_rh.management_events(id),
  actor_id integer NOT NULL CHECK (actor_id > 0),
  actor_email varchar(320) NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(event_id,actor_id,actor_email)
);
COMMIT;
