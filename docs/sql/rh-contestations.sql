-- Après rh-initial.sql et rh-account-links.sql ; base privée uniquement.
BEGIN;
CREATE TABLE redaction_rh.disputes (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  requester_account_id integer NOT NULL CHECK (requester_account_id > 0),
  idempotency_key uuid NOT NULL,
  requester_email varchar(320) NOT NULL,
  category varchar(20) NOT NULL CHECK (category IN ('remuneration','prestation','autre')),
  message varchar(1000) NOT NULL CHECK (length(trim(message)) > 0),
  status varchar(12) NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','cancelled')),
  response varchar(1000),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (requester_account_id, idempotency_key),
  CHECK ((status = 'answered' AND response IS NOT NULL AND length(trim(response)) > 0 AND resolved_at IS NOT NULL) OR (status <> 'answered' AND response IS NULL AND resolved_at IS NULL))
);
CREATE INDEX disputes_person_idx ON redaction_rh.disputes (collaborator_id, created_at DESC);
ALTER TABLE redaction_rh.audit_log ADD COLUMN dispute_id uuid REFERENCES redaction_rh.disputes(id);
COMMIT;
