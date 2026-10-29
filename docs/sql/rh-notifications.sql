-- Après rh-account-links.sql et rh-roles.sql ; base RH privée uniquement.
BEGIN;
CREATE TABLE redaction_rh.notifications (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL,
  account_id integer NOT NULL,
  account_email varchar(320) NOT NULL,
  event_type varchar(24) NOT NULL CHECK (event_type IN ('absence','prestation','remuneration','retrait')),
  source_id uuid NOT NULL,
  source_version integer NOT NULL CHECK (source_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  FOREIGN KEY (collaborator_id,account_id,account_email) REFERENCES redaction_rh.account_links (collaborator_id,account_id,account_email) ON DELETE CASCADE,
  UNIQUE (collaborator_id,event_type,source_id,source_version)
);
CREATE INDEX notifications_inbox_idx ON redaction_rh.notifications (collaborator_id, created_at DESC, id);
COMMIT;
